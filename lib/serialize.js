const { getContentType } = require('@whiskeysockets/baileys');

// Unwrap disappearing / view-once wrappers so we read the real content
function unwrap(message) {
    if (!message) return message;
    if (message.ephemeralMessage) return unwrap(message.ephemeralMessage.message);
    if (message.viewOnceMessage) return unwrap(message.viewOnceMessage.message);
    if (message.viewOnceMessageV2) return unwrap(message.viewOnceMessageV2.message);
    return message;
}

function extractText(message) {
    const type = getContentType(message);
    const content = message[type];
    switch (type) {
        case 'conversation':
            return message.conversation || '';
        case 'extendedTextMessage':
            return content?.text || '';
        case 'imageMessage':
        case 'videoMessage':
        case 'documentMessage':
            return content?.caption || '';
        case 'buttonsResponseMessage':
            return content?.selectedButtonId || '';
        case 'listResponseMessage':
            return content?.singleSelectReply?.selectedRowId || '';
        default:
            return '';
    }
}

// Turns a raw Baileys message into a simpler object that plugins can use
function serialize(conn, raw) {
    const chat = raw.key.remoteJid;
    const fromMe = !!raw.key.fromMe;
    const isGroup = chat.endsWith('@g.us');
    const senderJid = fromMe
        ? conn.user.id
        : (raw.key.participant || raw.key.remoteJid);
    const senderNumber = senderJid.split('@')[0].split(':')[0];
    const message = unwrap(raw.message) || {};

    return {
        raw,
        id: raw.key.id,
        chat,
        fromMe,
        isGroup,
        sender: senderJid,
        senderNumber,
        pushName: raw.pushName || 'User',
        text: extractText(message),
        reply: (text) => conn.sendMessage(chat, { text }, { quoted: raw }),
        react: (emoji) => conn.sendMessage(chat, { react: { text: emoji, key: raw.key } }),
    };
}

module.exports = { serialize };
