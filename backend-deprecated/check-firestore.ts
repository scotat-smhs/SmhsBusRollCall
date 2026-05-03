import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
  console.log('--- Checking Firestore Students ---');
  const snapshot = await db.collection('students').limit(5).get();
  if (snapshot.empty) {
    console.log('No students found!');
  } else {
    snapshot.forEach(doc => {
      console.log(`ID: ${doc.id} =>`, doc.data());
    });
  }
  process.exit(0);
}

checkData().catch(err => {
  console.error(err);
  process.exit(1);
});
