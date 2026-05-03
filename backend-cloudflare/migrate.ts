import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../backend/serviceAccountKey.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('Error: backend/serviceAccountKey.json not found.');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
    console.log('--- Fetching data from Firestore ---');
    const sqlPath = path.resolve(__dirname, 'migration.sql');
    fs.writeFileSync(sqlPath, '-- Migration from Firestore\n\n', 'utf8');

    const appendSql = (text: string) => fs.appendFileSync(sqlPath, text, 'utf8');

    // 1. Accounts
    try {
        console.log('Fetching accounts...');
        const accountsSnapshot = await db.collection('accounts').get();
        accountsSnapshot.forEach(doc => {
            const data = doc.data();
            appendSql(`INSERT OR REPLACE INTO accounts (username, password, type, name) VALUES ('${doc.id}', '${data.password}', '${data.type}', '${data.name}');\n`);
        });
    } catch (e) { console.error('Failed to fetch accounts:', e); }

    // 2. Config
    try {
        console.log('Fetching config...');
        const configSnapshot = await db.collection('config').get();
        configSnapshot.forEach(doc => {
            const data = doc.data();
            if (doc.id === 'slots') {
                appendSql(`INSERT OR REPLACE INTO config (key, value) VALUES ('slots', '${JSON.stringify(data.slots)}');\n`);
                if (data.default) {
                    appendSql(`INSERT OR REPLACE INTO config (key, value) VALUES ('default_slot', '${JSON.stringify(data.default)}');\n`);
                }
            } else if (doc.id.startsWith('buses')) {
                appendSql(`INSERT OR REPLACE INTO config (key, value) VALUES ('${doc.id}', '${JSON.stringify(data.list || [])}');\n`);
            }
        });
    } catch (e) { console.error('Failed to fetch config:', e); }

    // 3. Students
    try {
        console.log('Fetching students...');
        const studentsSnapshot = await db.collection('students').get();
        studentsSnapshot.forEach(doc => {
            const data = doc.data();
            const name = (data.name || '').replace(/'/g, "''");
            const badge = (data.badge || '').replace(/'/g, "''");
            const studentClass = (data.class || '').replace(/'/g, "''");
            const bus = (data.bus || '').replace(/'/g, "''");
            const photo = data.photo ? `'${data.photo}'` : 'NULL';
            appendSql(`INSERT OR REPLACE INTO students (uid, listType, name, badge, class, bus, photo) VALUES ('${data.uid}', '${data.listType || 'arrival'}', '${name}', '${badge}', '${studentClass}', '${bus}', ${photo});\n`);
        });
    } catch (e) { console.error('Failed to fetch students:', e); }

    // 4. Temporary Riders
    try {
        console.log('Fetching temporary riders...');
        const tempSnapshot = await db.collection('temporaryRiders').get();
        tempSnapshot.forEach(doc => {
            const data = doc.data();
            const name = (data.name || '').replace(/'/g, "''");
            const badge = (data.badge || '').replace(/'/g, "''");
            const studentClass = (data.class || '').replace(/'/g, "''");
            const bus = (data.bus || '').replace(/'/g, "''");
            appendSql(`INSERT INTO temporary_riders (date, timeSlot, bus, uid, name, badge, class) VALUES ('${data.date}', '${data.timeSlot}', '${bus}', '${data.uid}', '${name}', '${badge}', '${studentClass}');\n`);
        });
    } catch (e) { console.error('Failed to fetch temporary riders:', e); }

    // 5. Rollcalls
    try {
        console.log('Fetching rollcalls...');
        const rollcallCollections = ['rollcalls', 'RollCall', 'Rollcall'];
        for (const coll of rollcallCollections) {
            const snapshot = await db.collection(coll).limit(1000).get(); // Limit to avoid quota issues
            snapshot.forEach(doc => {
                const data = doc.data();
                const recordId = `${data.uid}_${data.date}_${data.timeSlot.replace(/:/g, '-')}`;
                appendSql(`INSERT OR REPLACE INTO rollcalls (id, uid, timestamp, date, timeSlot, syncedAt) VALUES ('${recordId}', '${data.uid}', '${data.timestamp}', '${data.date}', '${data.timeSlot}', '${data.syncedAt || new Date().toISOString()}');\n`);
            });
        }
    } catch (e) { console.error('Failed to fetch rollcalls:', e); }

    console.log('--- Migration SQL update complete: migration.sql ---');
}

migrate().catch(console.error);
