module.exports = {
    name: 'menu',
    aliases: ['help', 'commands'],
    category: 'general',
    description: 'Show all available commands',
    async execute(conn, m, { config, commands }) {
        const groups = {};
        for (const p of commands) {
            (groups[p.category] = groups[p.category] || []).push(p);
        }

        let text = `*${config.botName}*\n\n`;
        for (const category of Object.keys(groups).sort()) {
            text += `*${category.toUpperCase()}*\n`;
            for (const p of groups[category]) {
                text += `  ${config.prefix}${p.name}${p.description ? ` - ${p.description}` : ''}\n`;
            }
            text += '\n';
        }
        if (config.footer) text += `_${config.footer}_`;

        await m.reply(text.trim());
    },
};
