import fs from "fs";
import path from "path";

const MESSAGES_DIR = "./messages";
const SOURCE_FILE = "fr.json";

function getDeepKeys(obj, prefix = "") {
  return Object.keys(obj).reduce((res, el) => {
    if (Array.isArray(obj[el])) {
      return [...res, prefix + el];
    } else if (typeof obj[el] === "object" && obj[el] !== null) {
      return [...res, ...getDeepKeys(obj[el], prefix + el + ".")];
    }
    return [...res, prefix + el];
  }, []);
}

function getValue(obj, keyPath) {
  return keyPath.split(".").reduce((o, i) => (o ? o[i] : undefined), obj);
}

async function audit() {
  const sourceContent = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, SOURCE_FILE), "utf-8"));
  const sourceKeys = getDeepKeys(sourceContent);

  const files = fs
    .readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith(".json") && f !== SOURCE_FILE);

  const report = {};

  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, file), "utf-8"));
    const missing = [];
    const empty = [];

    for (const key of sourceKeys) {
      const val = getValue(content, key);
      if (val === undefined) {
        missing.push(key);
      } else if (val === "" || val === null) {
        empty.push(key);
      }
    }

    if (missing.length > 0 || empty.length > 0) {
      report[file] = {
        missing,
        empty,
      };
    }
  }

  if (Object.keys(report).length === 0) {
    console.log("✅ All translation files are up to date with fr.json");
  } else {
    console.log("❌ Discrepancies found:");
    for (const [file, data] of Object.entries(report)) {
      console.log(`\n📄 ${file}:`);
      if (data.missing.length > 0) {
        console.log(`  - Missing keys (${data.missing.length}):`);
        data.missing.forEach((k) => console.log(`    - ${k}`));
      }
      if (data.empty.length > 0) {
        console.log(`  - Empty values (${data.empty.length}):`);
        data.empty.forEach((k) => console.log(`    - ${k}`));
      }
    }
  }
}

audit().catch(console.error);
