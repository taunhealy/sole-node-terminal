const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.resolve(__dirname, '..', 'monitor', 'service-account-key.json'))) {
  const serviceAccount = require(path.resolve(__dirname, '..', 'monitor', 'service-account-key.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.error('Service account key not found.');
  process.exit(1);
}

const firestoreRules = fs.readFileSync(path.resolve(__dirname, 'firestore.rules'), 'utf8');

async function deployRules() {
  try {
    const rules = admin.securityRules();
    console.log('🚀 Creating Ruleset...');
    const ruleset = await rules.createRuleset({
       source: {
         files: [{
           name: 'firestore.rules',
           content: firestoreRules
         }]
       }
    });
    console.log(`✅ Ruleset created: ${ruleset.name}`);
    
    console.log('🚀 Releasing Firestore ruleset...');
    await rules.releaseFirestoreRuleset('cloud.firestore', ruleset.name);
    console.log('✅ Firestore Security Rules successfully deployed via Admin SDK.');
  } catch (error) {
    console.error('❌ Failed to deploy rules:', error);
    if (error.code === 'permission-denied') {
       console.log('💡 TIP: Ensure your service account has "Firebase Rules Admin" role.');
    }
  }
}

deployRules();
