const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const endTime = (Date.now() / 1000).toFixed(6);

    // 1. Terminate monitor
    if (fs.existsSync('/tmp/metrics/monitor.pid')) {
      const pid = fs.readFileSync('/tmp/metrics/monitor.pid', 'utf-8').trim();
      try {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`[lifecycle-timer] Terminated monitor PID: ${pid}`);
      } catch (_) {}
    }

    // 2. Compute final duration
    let startTime = endTime;
    if (fs.existsSync('/tmp/metrics/timing.env')) {
      const envContent = fs.readFileSync('/tmp/metrics/timing.env', 'utf-8');
      const match = envContent.match(/START_TIME=([0-9.]+)/);
      if (match) {
        startTime = match[1];
      }
    }

    const duration = (parseFloat(endTime) - parseFloat(startTime)).toFixed(2);
    fs.appendFileSync('/tmp/metrics/timing.env', `END_TIME=${endTime}\nDURATION=${duration}\n`);
    console.log(`[lifecycle-timer] Finished tracking. Total wall-clock time: ${duration}s`);

    // 3. Upload artifacts using the official actions artifact SDK
    const { DefaultArtifactClient } = require('@actions/artifact');
    const artifact = new DefaultArtifactClient();

    const jobName = process.env.INPUT_JOB_NAME || 'job';
    const runId = process.env.GITHUB_RUN_ID;
    const artifactName = `metrics-${jobName}-${runId}`;

    const filesToUpload = [
      '/tmp/metrics/timing.env',
      '/tmp/metrics/pidstat.log'
    ].filter(file => fs.existsSync(file));

    console.log(`[lifecycle-timer] Uploading artifact: ${artifactName}...`);
    const uploadResult = await artifact.uploadArtifact(
      artifactName,
      filesToUpload,
      '/tmp/metrics'
    );

    console.log(`[lifecycle-timer] Successfully uploaded ${artifactName} (ID: ${uploadResult.id || 'ok'})`);
  } catch (error) {
    console.error('[lifecycle-timer] Post execution failure:', error);
  }
})();