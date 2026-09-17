const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log("Installing sysstat and initializing monitor...");
  execSync('sudo apt-get update && sudo apt-get install -y sysstat', { stdio: 'inherit' });
  
  fs.mkdirSync('/tmp/metrics', { recursive: true });
  
  // Launch pidstat in the background detached
  const pidstatCmd = 'pidstat -u -r -d -l 1 > /tmp/metrics/pidstat.log & echo $!';
  const monPid = execSync(pidstatCmd, { shell: '/bin/bash' }).toString().trim();
  fs.writeFileSync('/tmp/metrics/monitor.pid', monPid);
  
  const startTime = (Date.now() / 1000).toFixed(6);
  fs.writeFileSync('/tmp/metrics/timing.env', `START_TIME=${startTime}\n`);
  
  console.log(`Started monitoring (PID: ${monPid}) at ${startTime}`);
} catch (error) {
  console.error("Failed in pre-step initialization:", error);
  process.exit(1);
}