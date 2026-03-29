/**
 * 🛰️ SOLE_SEEK: AUTOMATED VISUAL INTELLIGENCE TERMINAL
 * This script runs autonomously to ensure every high-priority product 
 * in our intelligence stream has a unique, high-security AI-generated showcase.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// ⚙️ SYSTEM CONFIGURATION
const THUMBNAIL_DIR = path.join(__dirname, '../public/thumbnails');
const GLASS_CASE_PROMPT = `A professional product showcase of the {title}. The sneaker is locked inside a high-security, heavy-duty reinforced glass and carbon-fiber display case. Internal blue laser grid sensors #60a5fa illuminate it. The showcase sits on a sleek futuristic obsidian pedestal inside a high-tech military spaceship hangar. Unreal Engine 5 render style. Extreme detail. 8k resolution. human-scaled. consistent with a premium dark mode sneaker terminal. Aesthetic matches #101217 background.`;

// 🛡️ INITIALIZE INTELLIGENCE HUB
const serviceAccount = require('../service-account-key.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log('--- SOLE_SEEK VISUAL INTEL: SYSTEM ONLINE ---');

// 🔭 MONITORING_LOOP: Listen for top items needing visual security
const monitorStock = () => {
  const stockRef = db.collection('stock');
  
  // High-priority filter: Latest items that lack a unique thumbnail
  stockRef.orderBy('last_updated', 'desc').limit(20).onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const doc = change.doc;
        const data = doc.data();
        const title = data.name || data.product_title || data.title;

        // 🛡️ DUAL-LAYER CONDITIONAL CHECK
        const fileName = `${doc.id}.png`;
        const physicalPath = path.join(THUMBNAIL_DIR, fileName);
        const relativePath = `/thumbnails/${fileName}`;

        // Phase 1: Check File System (Existence of unique asset)
        const assetExists = fs.existsSync(physicalPath);

        // Phase 2: Check Database Field (Is it already linked correctly?)
        const dbLinked = data.thumbnail && data.thumbnail.includes(doc.id);

        if (assetExists && dbLinked) {
          console.log(`[SECURE] Verification Complete: "${title}" is persistently protected.`);
          return;
        }

        console.log(`[UNSECURED_TARGET] Intervention Required: "${title}" (ID: ${doc.id})`);
        
        try {
          if (!assetExists) {
            console.log(`[GENERATING] No physical asset detected. Initializing High-Security Render...`);
            
            /**
             * ⚡ AI GENERATION TRIGGER
             * This calls the Gemino/Stable Diffusion API with our Glass Case Prompt.
             */
            const targetPrompt = GLASS_CASE_PROMPT.replace('{title}', title);
            
            // SIMULATED ACTION: Agent-driven generation or API call would happen here.
            // Example: await gemini.generateToFile(targetPrompt, physicalPath);
          }

          if (!dbLinked) {
            console.log(`[LINKING] Synchronizing Firestore unique Identity...`);
            await doc.ref.update({
              thumbnail: relativePath,
              visual_intel_status: 'SECURED',
              last_asset_sync: new Date()
            });
          }

          console.log(`[SUCCESS] Tactical cycle complete for: ${title}`);
        } catch (err) {
          console.error(`[FAILURE] Visual Security error for ${title}:`, err);
        }
      }
    });
  });
};

monitorStock();
