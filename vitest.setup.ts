// Désactive Redis Upstash en test : sinon checkRateLimit tente une vraie
// résolution DNS (4 s de timeout) puis fail-open. Les tests n'ont pas
// vocation à valider le rate-limit lui-même.
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";

// jsdom tourne ici sur une origine opaque (about:blank) → `localStorage` n'est
// pas exposé, ce qui fait planter tout test (ou module importé) qui s'en sert.
// On installe un polyfill mémoire simple pour toute la suite.
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  const storage: Storage = {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  }
}
