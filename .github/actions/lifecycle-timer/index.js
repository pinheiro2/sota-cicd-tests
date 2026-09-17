const { execSync, spawn } = require('child_process');
const fs = require('fs');

try {
  console.log('[lifecycle-timer] Installing sysstat...');
  execSync('sudo apt-get update && sudo apt-get install -y sysstat', { stdio: 'inherit' });

  fs.mkdirSync('/tmp/metrics', { recursive: true });

  const startTime = (Date.now() / 1000).toFixed(6);
  fs.writeFileSync('/tmp/metrics/timing.env', `START_TIME=${startTime}\n`);

  // Open output log file for background process
  const outFd = fs.openSync('/tmp/metrics/pidstat.log', 'a');

  // Spawn pidstat detached with independent file descriptors
  const child = spawn('pidstat', ['-u', '-r', '-d', '-l', '1'], {
    detached: true,
    stdio: ['ignore', outFd, outFd]
  });

  // Detach child so Node event loop does not wait for it to exit
  child.unref();

  fs.writeFileSync('/tmp/metrics/monitor.pid', `${child.pid}\n`);
  console.log(`[lifecycle-timer] Monitoring started (PID: ${child.pid}) at ${startTime}`);
} catch (error) {
  console.error('[lifecycle-timer] Failed in pre-step setup:', error);
  process.exit(1);
}