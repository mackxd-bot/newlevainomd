const path = require('path');
const fs = require('fs');
const express = require('express');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const config = require('./config');
const { serialize } = require('./lib/serialize');
const { loadPlugins } = require('./lib/loader');

const PORT = process.env.PORT || 3000;
const SESSION_DIR = path.resolve('./session');
const CREDS_FILE = path.join(SESSION_DIR, 'creds.json');
const PAIR_PASSWORD = process.env.PAIR_PASSWORD || '';
const logger = pino({ level: 'silent' });

const DATA_DIR = path.resolve('./data');
const RESTART_FLAG = path.join(DATA_DIR, 'restart.json');
const RESTART_CODE = 42; // index.js (supervisor) restarts the bot when it exits with this code

let plugins;
let pluginList;

// Reloads every plugin file without restarting the process
function reloadPlugins() {
    const loaded = loadPlugins();
    plugins = loaded.map;
    pluginList = loaded.list;
    return pluginList.length;
}
reloadPlugins();

// Exit with the restart code so the supervisor starts a fresh process
function restartBot() {
    console.log('Restart requested.');
    process.exit(RESTART_CODE);
}

process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err?.stack || err));
process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err?.stack || err));

let conn = null;          // current Baileys socket
let status = 'idle';      // idle | pairing | connected

function isPaired() {
    if (!fs.existsSync(CREDS_FILE)) return false;
    try {
        return !!JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8')).registered;
    } catch {
        return false;
    }
}

function dropSocket() {
    if (!conn) return;
    const old = conn;
    conn = null;
    try {
        old.ev.removeAllListeners();
        old.end(new Error('replaced'));
    } catch {}
}

async function createSocket() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    let version;
    try {
        ({ version } = await fetchLatestBaileysVersion());
    } catch {
        version = undefined; // Baileys falls back to its built-in version
    }

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        markOnlineOnConnect: false,
        syncFullHistory: false,
        getMessage: async () => undefined,
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => onConnectionUpdate(sock, update));
    sock.ev.on('messages.upsert', (upsert) => onMessages(sock, upsert));
    return sock;
}

function notifyAfterRestart(sock) {
    if (!fs.existsSync(RESTART_FLAG)) return;
    try {
        const { chat } = JSON.parse(fs.readFileSync(RESTART_FLAG, 'utf8'));
        fs.unlinkSync(RESTART_FLAG);
        if (chat) sock.sendMessage(chat, { text: `✅ *${config.botName}* restarted successfully.` }).catch(() => {});
    } catch (e) {
        console.error('Could not read restart flag:', e.message);
    }
}

function onConnectionUpdate(sock, { connection, lastDisconnect }) {
    if (sock !== conn) return; // ignore sockets that were replaced

    if (connection === 'open') {
        const wasPairing = status === 'pairing';
        status = 'connected';
        console.log(`Connected! ${config.botName} is running.`);

        notifyAfterRestart(sock);

        if (wasPairing) {
            const jid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            sock.sendMessage(jid, {
                text: `✅ *${config.botName}* is paired and connected.\n\nType *${config.prefix}menu* to see commands.`,
            }).catch(() => {});
        }
    }

    if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        conn = null;
        status = 'idle';

        if (code === DisconnectReason.loggedOut) {
            console.log('Logged out from WhatsApp. Removing session. Pair again from the web page.');
            fs.rmSync(SESSION_DIR, { recursive: true, force: true });
            return;
        }

        if (isPaired()) {
            console.log(`Connection closed (code ${code}). Reconnecting in 5s...`);
            setTimeout(() => {
                if (!conn && isPaired()) ensureConnected().catch(console.error);
            }, 5000);
        } else {
            console.log(`Pairing connection closed (code ${code}).`);
        }
    }
}

async function ensureConnected() {
    if (!conn) conn = await createSocket();
    return conn;
}

// Starts a fresh socket for a phone number and returns a pairing code
async function requestPairCode(number) {
    if (isPaired()) throw new Error('This bot is already paired.');

    dropSocket();
    status = 'pairing';
    const sock = await createSocket();
    conn = sock;

    // Give the socket a moment to reach WhatsApp before asking for a code
    await new Promise((r) => setTimeout(r, 3000));
    if (conn !== sock) throw new Error('Pairing was cancelled. Try again.');

    const code = await sock.requestPairingCode(number);
    return code?.match(/.{1,4}/g)?.join('-') || code;
}

async function onMessages(sock, { messages, type }) {
    if (type !== 'notify') return;
    const raw = messages[0];
    if (!raw?.message) return;
    if (raw.key.remoteJid === 'status@broadcast') return;

    const m = serialize(sock, raw);
    if (!m.text.startsWith(config.prefix)) return;

    const [cmdName = '', ...args] = m.text.slice(config.prefix.length).trim().split(/\s+/);
    const plugin = plugins.get(cmdName.toLowerCase());
    if (!plugin) return;

    const isOwner = m.fromMe || config.ownerNumbers.includes(m.senderNumber);

    if (plugin.ownerOnly && !isOwner) return m.reply('This command is for the owner only.');
    if (plugin.groupOnly && !m.isGroup) return m.reply('This command works only in groups.');

    try {
        await plugin.execute(sock, m, {
            config,
            args,
            text: args.join(' '),
            command: cmdName.toLowerCase(),
            isOwner,
            commands: pluginList,
            reload: reloadPlugins,
            restart: restartBot,
            flagRestart: (chat) => {
                fs.mkdirSync(DATA_DIR, { recursive: true });
                fs.writeFileSync(RESTART_FLAG, JSON.stringify({ chat }));
            },
        });
    } catch (err) {
        console.error(`[ERROR] ${plugin.name}:`, err);
        await m.reply(`Error: ${err.message}`);
    }
}

// ---------- Web server ----------
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/status', (req, res) => {
    res.json({
        botName: config.botName,
        paired: isPaired(),
        connected: status === 'connected',
        passwordRequired: !!PAIR_PASSWORD,
    });
});

app.get('/pair', async (req, res) => {
    if (PAIR_PASSWORD && req.get('x-pair-password') !== PAIR_PASSWORD) {
        return res.status(401).json({ error: 'Wrong password.' });
    }

    const number = String(req.query.number || '').replace(/\D/g, '');
    if (number.length < 7 || number.length > 15) {
        return res.status(400).json({ error: 'Invalid number. Use country code + digits.' });
    }

    try {
        const code = await requestPairCode(number);
        res.json({ code });
    } catch (err) {
        console.error('Pairing error:', err.message);
        res.status(400).json({ error: err.message || 'Could not get pairing code.' });
    }
});

app.listen(PORT, () => {
    console.log(`Web pairing page: http://localhost:${PORT}`);
});

// Reconnect automatically if already paired
if (isPaired()) {
    ensureConnected().catch((err) => console.error('Failed to start:', err));
} else {
    console.log('Not paired yet. Open the web page to get a pairing code.');
}
