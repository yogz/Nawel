const ai = require("ai");
console.log("Exports:", Object.keys(ai));
console.log("Has fallback:", "fallback" in ai);
console.log("Has experimental_fallback:", "experimental_fallback" in ai);
console.log("Has LanguageModelV3:", "LanguageModelV3" in ai);
