require('dotenv').config();

const digitsOnly = (s) => String(s || '').replace(/\D/g, '');

module.exports = {
    botName: process.env.BOT_NAME || 'Mini Bot',
    prefix: process.env.PREFIX || '.',
    ownerNumbers: (process.env.OWNER_NUMBERS || '').split(',').map(digitsOnly).filter(Boolean),
    footer: process.env.FOOTER || '',
};
