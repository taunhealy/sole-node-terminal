const admin = require('firebase-admin');
const path = require('path');
// Put the file in the same directory for simplicity
const serviceAccount = require('./service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function upgrade() {
  const email = "taunhealy@gmail.com";
  console.log(`🧬 Upgrading ${email} to PRO...`);
  
  await db.collection('users').doc(email).set({
    tier: 'Pro',
    subscription_status: 'active',
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  console.log("✅ Success: taunhealy@gmail.com is now a PRO member.");
}

upgrade().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
