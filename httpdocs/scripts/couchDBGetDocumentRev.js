if (!process.argv[2] || !process.argv[3] || !process.argv[4]) {
    console.log('USAGE:');
    console.log("node couchDBGetDocumentRev.js <COUCHDB_URL> <db-name> <doc-id> [rev-id]");
    console.log("----");
    console.log("Examples:");
    return;
}

let dbUrl = process.argv[2] || 'http://admin:admin@jmfc.dynseo.com:6984';
let dbName = process.argv[3] || null;
let docId = process.argv[4] || null;
let revId = process.argv[5] || null;

console.log('using url: ' + dbUrl);
const nano = require('nano')({
    "url": dbUrl.trim(),
    "requestDefaults": {"timeout": 250000} // 250 seconds
});

const db = nano.db.use(dbName);

async function main() {
    let options = revId ? {rev: revId} : undefined;
    const result = await db.get(docId, options);
    console.log(JSON.stringify(result));
}

main();

