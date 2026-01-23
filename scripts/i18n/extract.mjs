import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';
const MESSAGES_FILE = './messages/fr.json';

// Helper to flatten JSON
function flatten(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(acc, flatten(obj[key], pre + key));
        } else {
            acc[pre + key] = true;
        }
        return acc;
    }, {});
}

const existingKeys = flatten(JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8')));

function findInFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findInFiles(filePath, fileList);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const allSourceFiles = findInFiles(SRC_DIR);
const missingInCode = new Set();

allSourceFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // Find useTranslations("...")
    const utMatch = content.match(/useTranslations\("([^"]+)"\)/);
    const prefix = utMatch ? utMatch[1] : '';

    // Find t("...")
    const tRegex = /t\("([^"]+)"\)/g;
    let match;
    while ((match = tRegex.exec(content)) !== null) {
        const key = match[1];
        const fullKey = prefix ? `${prefix}.${key}` : key;

        // Ignore keys that are already full paths (containing dots if they don't match the prefix)
        // and ignore keys with variables or markers like {count}
        if (!existingKeys[fullKey] && !key.includes('{')) {
            // If the key has dots, it might be a direct access or an error
            if (!existingKeys[key]) {
                missingInCode.add(fullKey);
            }
        }
    }
});

if (missingInCode.size === 0) {
    console.log("✅ No missing keys found in the code.");
} else {
    console.log("❌ The following keys are used in the code but missing from the translation files:");
    console.log(JSON.stringify(Array.from(missingInCode).sort(), null, 2));
}
