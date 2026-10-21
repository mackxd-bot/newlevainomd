module.exports = {
    name: 'owner',
    aliases: ['ownerinfo'],
    category: 'owner',
    description: 'Owner-only example command',
    ownerOnly: true,
    async execute(conn, m, { config }) {
        await m.reply(`You are the owner of *${config.botName}* ✅`);
    },
};
