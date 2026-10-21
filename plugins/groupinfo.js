module.exports = {
    name: 'groupinfo',
    aliases: ['ginfo'],
    category: 'group',
    description: 'Show group details',
    groupOnly: true,
    async execute(conn, m) {
        const meta = await conn.groupMetadata(m.chat);
        const admins = meta.participants.filter((p) => p.admin).length;

        const text = `*${meta.subject}*

Members: ${meta.participants.length}
Admins: ${admins}
Created: ${new Date(meta.creation * 1000).toLocaleDateString()}
${meta.desc ? `\nDescription:\n${meta.desc}` : ''}`;

        await m.reply(text.trim());
    },
};
