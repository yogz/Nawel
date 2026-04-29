// Désactive Redis Upstash en test : sinon checkRateLimit tente une vraie
// résolution DNS (4 s de timeout) puis fail-open. Les tests n'ont pas
// vocation à valider le rate-limit lui-même.
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";
