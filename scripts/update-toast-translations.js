const fs = require("fs");
const path = require("path");

const messagesDir = path.join(__dirname, "..", "messages");
const files = fs.readdirSync(messagesDir).filter((f) => f.endsWith(".json"));

const updates = {
  fr: { deleted: "{name} supprimé ✓", checked: "Article coché ✓", unchecked: "Article décoché ✓" },
  en: { deleted: "{name} deleted ✓", checked: "Item checked ✓", unchecked: "Item unchecked ✓" },
  es: {
    deleted: "{name} eliminado ✓",
    checked: "Artículo marcado ✓",
    unchecked: "Artículo desmarcado ✓",
  },
  pt: { deleted: "{name} removido ✓", checked: "Item marcado ✓", unchecked: "Item desmarcado ✓" },
  de: {
    deleted: "{name} gelöscht ✓",
    checked: "Artikel abgehakt ✓",
    unchecked: "Artikel nicht abgehakt ✓",
  },
  it: {
    deleted: "{name} eliminato ✓",
    checked: "Articolo spuntato ✓",
    unchecked: "Articolo non spuntato ✓",
  },
  nl: {
    deleted: "{name} verwijderd ✓",
    checked: "Item aangevinkt ✓",
    unchecked: "Item uitgevinkt ✓",
  },
  pl: { deleted: "{name} usunięty ✓", checked: "Zaznaczono ✓", unchecked: "Odznaczono ✓" },
  da: { deleted: "{name} slettet ✓", checked: "Vare markeret ✓", unchecked: "Vare afmarkeret ✓" },
  sv: {
    deleted: "{name} raderad ✓",
    checked: "Artikel markerad ✓",
    unchecked: "Artikel avmarkerad ✓",
  },
  el: {
    deleted: "{name} διαγράφηκε ✓",
    checked: "Το αντικείμενο επιλέχθηκε ✓",
    unchecked: "Το αντικείμενο αποεπιλέχθηκε ✓",
  },
  tr: {
    deleted: "{name} silindi ✓",
    checked: "Ürün işaretlendi ✓",
    unchecked: "Ürün işareti kaldırıldı ✓",
  },
};

files.forEach((file) => {
  const locale = file.replace(".json", "");
  const filePath = path.join(messagesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (data.Translations && data.Translations.item) {
    const localeUpdates = updates[locale] || updates["en"]; // Fallback to EN if unknown

    data.Translations.item.deleted = localeUpdates.deleted;
    data.Translations.item.checked = localeUpdates.checked;
    data.Translations.item.unchecked = localeUpdates.unchecked;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
    console.log(`Updated ${file}`);
  }
});
