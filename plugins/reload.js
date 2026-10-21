module.exports = {
    name: 'reload',
    aliases: ['rl'],
    category: 'owner',
    description: 'Reload all plugins (no restart)',
    ownerOnly: true,
    async execute(conn, m, { reload }) {
        const count = reload();
        await m.reply(`✅ Plugins reloaded: ${count} loaded.`);
    },
};
