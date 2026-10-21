// Supervisor: starts bot.js and restarts it when requested (.restart) or after a crash.
const { spawn } = require('child_process');
const path = require('path');

const RESTART_CODE = 42;
const CRASH_RESTART_DELAY = 5000;

let child = null;
let shuttingDown = false;

function start() {
    child = spawn(process.execPath, [path.join(__dirname, 'bot.js')], { stdio: 'inherit' });

    child.on('exit', (code, signal) => {
        child = null;
        if (shuttingDown) return process.exit(0);

        if (code === RESTART_CODE) {
            console.log('[SUPERVISOR] Restarting bot...');
            return start();
        }
        if (code === 0) {
            console.log('[SUPERVISOR] Bot stopped.');
            return process.exit(0);
        }
        console.log(`[SUPERVISOR] Bot exited (code ${code ?? signal}). Restarting in 5s...`);
        setTimeout(start, CRASH_RESTART_DELAY);
    });
}

for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
        shuttingDown = true;
        if (child) child.kill(sig);
        else process.exit(0);
    });
}

start();
