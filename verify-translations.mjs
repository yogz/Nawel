import fs from 'fs';
import path from 'path';

const MESSAGES_DIR = './messages';

function flatten(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(acc, flatten(obj[key], pre + key));
        } else {
            acc[pre + key] = obj[key];
        }
        return acc;
    }, {});
}

const files = fs.readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json'));
const translations = {};
const allKeys = new Set();

files.forEach(file => {
    const content = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, file), 'utf8'));
    const flattened = flatten(content);
    translations[file] = flattened;
    Object.keys(flattened).forEach(key => allKeys.add(key));
});

const results = {};

files.forEach(file => {
    const missing = [];
    const empty = [];
    const langKeys = translations[file];

    allKeys.forEach(key => {
        if (!(key in langKeys)) {
            missing.push(key);
        } else if (langKeys[key] === '' || langKeys[key] === null || langKeys[key] === undefined) {
            empty.push(key);
        }
    });

    if (missing.length > 0 || empty.length > 0) {
        results[file] = { missing, empty };
    }
});

if (Object.keys(results).length === 0) {
    console.log('✅ All translation files are consistent and complete!');
} else {
    console.log('❌ Found inconsistencies in translation files:\n');
    for (const [file, data] of Object.entries(results)) {
        console.log(`--- ${file} ---`);
        if (data.missing.length > 0) {
            console.log(`Missing keys (${data.missing.length}):`);
            data.missing.sort().forEach(key => console.log(`  - ${key}`));
        }
        if (data.empty.length > 0) {
            console.log(`Empty translations (${data.empty.length}):`);
            data.empty.sort().forEach(key => console.log(`  - ${key}`));
        }
        console.log('');
    }
}
