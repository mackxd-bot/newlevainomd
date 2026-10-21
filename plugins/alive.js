const os = require('os');

module.exports = {
    name: 'alive',
    category: 'general',
    description: 'Show bot status',
    async execute(conn, m, { config, commands }) {
        const uptime = Math.floor(process.uptime());
        const h = Math.floor(uptime / 3600);
        const min = Math.floor((uptime % 3600) / 60);
        const s = uptime % 60;
        const mb = (n) => (n / 1024 / 1024).toFixed(0) + ' MB';

        const text = `*${config.botName}* is alive ✅

Owner: ${config.ownerNumbers[0] ? '+' + config.ownerNumbers[0] : 'not set'}
Plugins: ${commands.length}
Uptime: ${h}h ${min}m ${s}s
Platform: ${os.platform()}
RAM: ${mb(os.totalmem() - os.freemem())} / ${mb(os.totalmem())}`;

        await m.reply(text);
    },
};
