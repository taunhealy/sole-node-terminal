# 🛰️ SOLESEEK: TACTICAL ARCHITECTURE & INTELLIGENCE PIPELINE

This document serves as the **Gold Standard Reference** for the SoleSeek autonomous intelligence fleet. It outlines the end-to-end lifecycle of a sneaker data packet, from initial scraping to high-security terminal rendering.

---

## 1. THE SURVEILLANCE LAYER (Backend Scrapers)
**Location:** `/monitor/main.py`  
**Runtime:** Google Cloud Run (FastAPI)  
**Cycle:** Triggered every 5-15 mins via Google Cloud Scheduler (Cron) to the `/check` endpoint.

### 📡 Phase A: Multi-Node Scanning
- **Engine:** Uses `curl_cffi` for high-fidelity browser impersonation (Chrome 110/Windows).
- **Targets:** 
    - **Shelflife:** Scans `products.json` (Searchspring API).
    - **Jack Lemkus:** Scans Shopify `products.json` endpoint.
- **Normalization:** Data from various boutiques is normalized into a standard `StockItem` interface before being processed.

### 🛡️ Phase B: Intelligence State Logic
- **SKU Isolation:** Every size/variant receives a specific ID (e.g., `sh-119498-UK8`).
- **Restock Detection:** If `current_soh > 0` AND the database `old_soh == 0`, a **RESTOCK** event is triggered.
- **Sale Detection:** If `current_price < original_price`, a **GLOBAL_SALE** event is triggered.
- **Persistence:** 
    - `restocked_at`: Timestamp updated only on stock arrival.
    - `last_updated`: Standard heartbeat timestamp.
    - `soh`: Current stock on hand across all nodes.

---

## 2. THE DISPATCH LAYER (Alerts & Broadcasting)
**Location:** `/monitor/main.py` & `/monitor/overwatch_briefing.py`

### 📢 Immediate Broadcaster
- **Transition Alerts:** When a Restock or New Release is confirmed, the system broadcasts to Discord instantly.
- **Global Broadcast Guard:** Prevents duplicate alerts for the same model across different stores (e.g., if Shelflife and Lemkus both restock the same shoe, only the first node triggers the alert).

### 🧠 AI Overwatch Briefing
- **Trigger:** Executes automatically after every successful boutique scan.
- **Engine:** Gemini 1.5 Flash.
- **Dispatch:** Generates three distinct tactical reports:
    1. **MARKET_RECON:** Price drops and margin opportunities.
    2. **TRENDING_INTEL:** Strategic wait/buy predictions and sector leaks.
    3. **RESELLERS_RECON:** Localized supply scouting and store behavior analysis.

---

## 3. THE VISUAL INTELLIGENCE TERMINAL (Frontend)
**Location:** `/frontend/app/trending/page.tsx`  
**Route:** `localhost:3000/trending`

### 🏢 Multiplex Terminal (Trending View)
- **ID-Prefix Deduplication:** The frontend collapses all SKU sizes into a single **Master Product Card** using the ID prefix (e.g., `sh-119498`). This ensures 100% unique model listings.
- **Real-Time Feed:** Uses Firestore `onSnapshot` for millisecond-latency updates as scrapers report new data.

### 🎨 High-Security Asset Pipeline
- **Automation Script:** `/frontend/scripts/automate_thumbnails.js` monitors for unrendered stock.
- **Prompt Standard:** "High-Security Glass Case" – a standardized, cinematic UE5 aesthetic featuring subtle blue laser grids (#60a5fa) and carbon-fiber display pods.
- **Dynamic Identity:** If an AI asset hasn't been generated yet, the UI provides a **Stable Brand-Aware Fallback** (rotating Hangars, Cockpits, and Labs) to maintain visual variety.

---

## 4. DATA SCHEMA SUMMARY (Firestore)

| Collection | Key Fields | Purpose |
| :--- | :--- | :--- |
| `stock` | `product_title`, `restocked_at`, `soh`, `thumbnail` | The core inventory source of truth. |
| `restock_logs` | `product_title`, `quantity_added`, `detected_at` | Driving the live ticker/feed. |
| `broadcast_logs` | `model_key`, `alert_type`, `timestamp` | Preventing duplicate Discord alerts. |
| `ai_broadcasts` | `content`, `timestamp`, `type` | Persistent record of AI Overwatch reports. |

---

## 5. TRIGGERING INDEPENDENCE (Manual Overrides)

While the system is 100% autonomous via Cloud Scheduler, you can bypass the schedule or the frontend UI using these direct tactical commands:

### 📡 Option A: High-Speed Terminal (curl)
If using a standard terminal (Command Prompt or Git Bash), run:
```bash
curl -X GET "https://solenode-api-256432107914.africa-south1.run.app/api/v1/automation/run-all?key=SOLE_SEEK_AUTO_2026_TAC"
```

### 🏹 Option B: Native PowerShell (Invoke-RestMethod)
Since PowerShell aliases `curl` to `Invoke-WebRequest`, use this native command instead:
```powershell
Invoke-RestMethod -Uri "https://solenode-api-256432107914.africa-south1.run.app/api/v1/automation/run-all?key=SOLE_SEEK_AUTO_2026_TAC" -Method Get
```

### ⚡ Option C: PowerShell Utility Script (One-Click)
I have provided `trigger_fleet_sync.ps1` in the project root. Simply run:
```powershell
./trigger_fleet_sync.ps1
```

---

## 🛰️ SYSTEM HEALTH CHECK
To verify if the entire pipeline is operational:
1. **Pulse:** Check `GET /` on Cloud Run (Status: `SoleSeek_Fleet_Commander_V2_Active`).
2. **Scan:** Use the **Option A (curl)** command above to force a boutique scan.
3. **Intel:** Verify new entries in `broadcast_logs` and new messages in Discord `#market-recon`.
4. **Visual:** Verify the `/trending` terminal renders the new model in a unique tactical room.

**ARCHITECTURE STATUS: FULLY AUTONOMOUS & INTEGRATED.**
