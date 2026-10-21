module.exports = {
    name: 'restart',
    aliases: ['reboot'],
    category: 'owner',
    description: 'Restart the bot process',
    ownerOnly: true,
    async execute(conn, m, { restart, flagRestart }) {
        await m.reply('♻️ Restarting bot...');
        flagRestart(m.chat);             // bot tells this chat when it is back online
        setTimeout(restart, 1000);       // give the reply time to send
    },
};
