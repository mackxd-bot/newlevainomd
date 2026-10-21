const fs = require('fs');
const path = require('path');

const PLUGIN_DIR = path.join(__dirname, '..', 'plugins');

// Loads every .js file in /plugins. Files starting with "_" are skipped (see _template.js).
// Each plugin exports: { name, execute(conn, m, ctx) } and may have
// aliases, category, description, ownerOnly, groupOnly.
function loadPlugins() {
    const map = new Map();   // name / alias -> plugin
    const list = [];         // unique plugins (used by the menu)

    if (!fs.existsSync(PLUGIN_DIR)) fs.mkdirSync(PLUGIN_DIR, { recursive: true });

    for (const file of fs.readdirSync(PLUGIN_DIR)) {
        if (!file.endsWith('.js') || file.startsWith('_')) continue;
        try {
            const fullPath = path.join(PLUGIN_DIR, file);
            delete require.cache[require.resolve(fullPath)]; // fresh copy on every reload
            const plugin = require(fullPath);
            if (!plugin || !plugin.name || typeof plugin.execute !== 'function') {
                console.log(`[PLUGIN] Skipped ${file}: missing "name" or "execute"`);
                continue;
            }
            plugin.category = plugin.category || 'misc';
            plugin.description = plugin.description || '';
            plugin.aliases = plugin.aliases || [];

            map.set(plugin.name.toLowerCase(), plugin);
            for (const alias of plugin.aliases) map.set(alias.toLowerCase(), plugin);
            list.push(plugin);
            console.log(`[PLUGIN] Loaded: ${plugin.name} (${file})`);
        } catch (err) {
            console.error(`[PLUGIN] Failed to load ${file}: ${err.message}`);
        }
    }
    return { map, list };
}

module.exports = { loadPlugins };
