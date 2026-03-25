# 🚀 SoleNode.io | Sneaker Deep Monitor & Terminal

A professional-grade sneaker restock monitor and real-time dashboard for **Shelflife**, **Jack Lemkus**, **Archive (Bash)**, and **Amazon.co.za**.

### 📦 Project Structure
- **/monitor**: Desktop Python application using `customtkinter` and `undetected-chromedriver` for stealth scanning.
- **/sneak-alert**: Next.js 15+ real-time terminal dashboard with high-fidelity size filtering and "Watchlist" alerts.

### ✨ Key Features
- **Stealth Scrapers**: Built-in Cloudflare bypass and headless Amazon scraping.
- **Enriched Data**: Archive store enrichment fetches real sizes (7, 8, 9) instead of generic placeholders.
- **Phantom Filters**: Dashboard UI inspired by high-end trade terminals with multi-select dropdowns.
- **Firestore Sync**: Seamless real-time synchronization between the desktop monitor and global dashboard.

### 🛠️ Local Setup
1. **Monitor**: 
   - `pip install -r monitor/requirements.txt`
   - Place your `service-account-key.json` in `monitor/`.
   - Run `python monitor/solenode_gui.py`.
2. **Dashboard**:
   - `npm install` inside `sneak-alert/`.
   - Setup your Firebase config in `.env.local`.
   - `npm run dev`.

---
© 2026 SoleNode.io
