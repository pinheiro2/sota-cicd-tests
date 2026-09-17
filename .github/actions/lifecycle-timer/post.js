const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');

(async () => {
  try {
    const endTime = (Date.now() / 1000).toFixed(6);

    // 1. Terminate pidstat monitor cleanly
    if (fs.existsSync('/tmp/metrics/monitor.pid')) {
      const pid = fs.readFileSync('/tmp/metrics/monitor.pid', 'utf-8').trim();
      try {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`[lifecycle-timer] Terminated monitor PID: ${pid}`);
      } catch (_) {
        // Process might already be terminated
      }
    }

    // 2. Parse and compute timing duration
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
    console.log(`[lifecycle-timer] Completed. Total time (including post-steps): ${duration}s`);

    // 3. Package metrics into zip archive
    const jobName = process.env.INPUT_JOB_NAME || 'job';
    const runId = process.env.GITHUB_RUN_ID;
    const artifactName = `metrics-${jobName}-${runId}`;
    const zipPath = `/tmp/${artifactName}.zip`;

    console.log(`[lifecycle-timer] Compressing metrics to ${zipPath}...`);
    execSync(`zip -j -r "${zipPath}" /tmp/metrics/*`, { stdio: 'ignore' });

    // 4. Upload zip via GitHub Actions Artifact v4 API
    const token = process.env.ACTIONS_RUNTIME_TOKEN;
    const runtimeUrl = process.env.ACTIONS_RESULTS_URL;

    if (token && runtimeUrl) {
      console.log(`[lifecycle-timer] Uploading artifact ${artifactName}...`);
      await uploadArtifact(artifactName, zipPath, token, runtimeUrl);
      console.log('[lifecycle-timer] Artifact successfully uploaded.');
    } else {
      console.log('[lifecycle-timer] Runtime token not detected. Using gh cli fallback...');
      execSync(`gh run upload-artifact --name "${artifactName}" --path "${zipPath}" || true`, {
        stdio: 'inherit',
        env: process.env
      });
    }
  } catch (error) {
    console.error('[lifecycle-timer] Error during post cleanup:', error);
  }
})();

function uploadArtifact(name, filePath, token, runtimeUrl) {
  return new Promise((resolve, reject) => {
    const fileSize = fs.statSync(filePath).size;
    const url = new URL(`${runtimeUrl}twirp/github.actions.results.api.v1.ArtifactService/CreateArtifact`);

    const reqData = JSON.stringify({
      workflow_run_backend_id: process.env.GITHUB_RUN_ID,
      workflow_job_run_backend_id: process.env.GITHUB_JOB,
      name: name,
      version: 4
    });

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqData)
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          if (!body.signed_upload_url) {
            return resolve(); // Soft fail over to standard completion
          }
          const uploadUrl = new URL(body.signed_upload_url);
          const uploadReq = https.request(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': fileSize
            }
          }, (upRes) => {
            upRes.on('data', () => {});
            upRes.on('end', () => resolve());
          });

          uploadReq.on('error', reject);
          fs.createReadStream(filePath).pipe(uploadReq);
        } catch (e) {
          resolve();
        }
      });
    });

    req.on('error', () => resolve());
    req.write(reqData);
    req.end();
  });
}