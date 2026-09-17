const { execSync } = require('child_process');
const fs = require('fs');

try {
  const endTime = (Date.now() / 1000).toFixed(6);
  
  // Read START_TIME from file
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

  // Terminate monitor process
  if (fs.existsSync('/tmp/metrics/monitor.pid')) {
    const pid = fs.readFileSync('/tmp/metrics/monitor.pid', 'utf-8').trim();
    try {
      execSync(`kill ${pid} || true`, { stdio: 'ignore' });
    } catch (_) {}
  }

  console.log(`Stopped monitoring. Total time (including post-steps): ${duration} seconds.`);

  // Upload the metric artifact using GitHub CLI
  const jobName = process.env.INPUT_JOB_NAME || 'job';
  const runId = process.env.GITHUB_RUN_ID;
  const artifactName = `metrics-${jobName}-${runId}`;

  console.log(`Uploading artifact ${artifactName}...`);
  execSync(`gh actions-upload-artifact --name "${artifactName}" --path "/tmp/metrics/" || true`, {
    shell: '/bin/bash',
    stdio: 'inherit',
    env: process.env
  });
} catch (error) {
  console.error("Error in post-step hook:", error);
}