module.exports = {
    name: 'ping',
    aliases: ['p'],
    category: 'general',
    description: 'Check bot response speed',
    async execute(conn, m) {
        const start = Date.now();
        const sent = await m.reply('Pinging...');
        const latency = Date.now() - start;
        await conn.sendMessage(m.chat, { edit: sent.key, text: `Pong! ${latency}ms` });
    },
};
