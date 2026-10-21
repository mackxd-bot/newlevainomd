// TEMPLATE: copy this file, rename it (e.g. hello.js), and edit it.
// Files starting with "_" are ignored by the loader, so this file itself is never run.

module.exports = {
    name: 'hello',              // command name: .hello
    aliases: ['hi'],            // other ways to call it: .hi
    category: 'fun',            // groups commands in the menu
    description: 'Say hello',   // shown in the menu
    ownerOnly: false,           // true = only owner / fromMe can use it
    groupOnly: false,           // true = only works inside groups

    // conn  -> Baileys socket (send messages, edit, react, group info, ...)
    // m     -> the message: m.text, m.chat, m.sender, m.isGroup, m.reply(), m.react()
    // ctx   -> { config, args, text, command, isOwner, commands }
    async execute(conn, m, { text }) {
        const name = text || m.pushName;
        await m.reply(`Hello ${name}! 👋`);
    },
};
