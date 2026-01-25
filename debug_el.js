const { getTranslations } = require("next-intl/server");

// Mock request locale
const locale = "el";

async function verify() {
  try {
    // We need to mock the next-intl environment or just read the file manually
    // since we can't easily run next-intl outside of Next.js context in this shell.
    // Instead, let's just read the JSON file directly using the same logic as the app would (fs)
    // to verify the structure, but wait, the app uses `getTranslations` which relies on `i18n.ts`.

    // Let's rely on node fs to read the file and inspect it strictly.
    const fs = require("fs");
    const path = require("path");

    const filePath = path.join(process.cwd(), "messages", "el.json");
    const content = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(content);

    const services = json.DefaultServices.total;

    console.log("--- RAW JSON CONTENT ---");
    console.log(JSON.stringify(services, null, 2));

    console.log("--- TYPE CHECK ---");
    console.log("Is array?", Array.isArray(services));
    console.log("Item 0 type:", typeof services[0]);
    console.log("Item 0 keys:", Object.keys(services[0]));
    console.log("Item 0 title:", services[0].title);
    console.log("Item 0 description:", services[0].description);
  } catch (e) {
    console.error(e);
  }
}

verify();
