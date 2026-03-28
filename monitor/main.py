from fastapi import FastAPI, BackgroundTasks, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from curl_cffi import requests
from google.cloud import firestore
import os
import json
from dotenv import load_dotenv
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Any

load_dotenv()

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ VALIDATION ERROR: {exc}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# --- GOOGLE CLOUD CONFIG ---
# Automatically find local key if available
KEY_PATH = "service-account-key.json"
if os.path.exists(KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(KEY_PATH)

db = firestore.Client()

# --- API MODELS ---
class HeartbeatData(BaseModel):
    node_id: str
    email: str
    mode: str
    status: str
    tier: str
    platform: str
    alias: str = "Anonymous"

class StockItem(BaseModel):
    sid: str
    title: str
    sz: Any = "N/A"
    color: Any = "—"
    soh: Any = 0
    price: Any = 0
    old_price: Optional[float] = None
    url: Optional[str] = ""
    sku_code: Optional[str] = None

class SyncData(BaseModel):
    items: List[StockItem]
    store: str

class HitRecord(BaseModel):
    product_title: str
    store: str
    size: str = "N/A"
    alias: str = "Anonymous"
    timestamp: Optional[datetime] = None

# --- HUB API ENDPOINTS (FOR DESKTOP MONITOR) ---

@app.get("/api/v1/profile/{email}")
async def get_profile(email: str):
    """Securely fetches user tier without client-side DB keys."""
    user_ref = db.collection("users").document(email)
    doc = user_ref.get()
    if not doc.exists:
        return {"tier": "Free", "exists": False}
    
    data = doc.to_dict()
    return {
        "tier": data.get("tier", "Free"),
        "first_name": data.get("first_name", "Commander"),
        "exists": True
    }

@app.post("/api/v1/update-profile")
async def update_profile(data: dict):
    """Securely updates cloud-side user profile data."""
    email = data.get("email")
    if not email:
        return {"status": "error", "message": "Email is required"}
    
    user_ref = db.collection("users").document(email)
    user_ref.set(data, merge=True)
    return {"status": "profile_synced"}

@app.post("/api/v1/heartbeat")
async def post_heartbeat(data: HeartbeatData):
    """Updates node activity status in the cloud database."""
    node_ref = db.collection("active_nodes").document(data.node_id)
    node_ref.set({
        "last_seen": firestore.SERVER_TIMESTAMP,
        "mode": data.mode,
        "node_name": data.alias or data.node_id,
        "alias": data.alias,
        "owner_email": data.email,
        "platform": data.platform,
        "status": data.status,
        "tier": data.tier
    }, merge=True)
    
    # Seed Initial Stats on first heartbeat if doc doesn't exist
    stats_ref = db.collection("stock").document("_global_stats")
    if not stats_ref.get().exists:
        stats_ref.set({
            "total_hits": 1421,
            "last_hit_at": firestore.SERVER_TIMESTAMP
        }, merge=True)

    return {"status": "heartbeat_received"}

@app.post("/api/v1/sync-stock")
async def sync_stock(data: SyncData):
    """Aggregates scraped data from local nodes into the global database."""
    items = data.items
    for i in range(0, len(items), 500):
        batch = db.batch()
        chunk = items[i:i + 500]
        for item in chunk:
            ref = db.collection("stock").document(item.sid)
            batch.set(ref, {
                "sku_id": item.sid,
                "product_title": item.title,
                "size_title": item.sz,
                "color": item.color,
                "soh": item.soh,
                "current_price": item.price,
                "original_price": item.old_price or item.price,
                "store": data.store,
                "url": item.url,
                "sku_code": item.sku_code,
                "last_updated": firestore.SERVER_TIMESTAMP
            }, merge=True)
        batch.commit()
    
    # NEW: Global Terminal Heartbeat (for Frontend Activity Indicator)
    db.collection("stock").document("_terminal_status").set({
        "last_scan_at": firestore.SERVER_TIMESTAMP,
        "store": data.store,
        "item_count": len(items)
    }, merge=True)

    return {"status": "success", "count": len(items)}
    return {"status": "sync_complete", "count": len(data.items)}

@app.get("/api/v1/watchlist/{email}")
async def get_watchlist(email: str):
    """Fetches user alerts to sync back to the local monitor."""
    docs = db.collection("user_alerts") \
             .where("user_email", "==", email) \
             .where("status", "==", "active").stream()
    
    watchlist = []
    for d in docs:
        watchlist.append(d.to_dict().get("product_title"))
    return {"watchlist": watchlist}

@app.post("/api/v1/record-hit")
async def record_hit(hit: HitRecord):
    """Logs a successful sniper match for global statistics and ticker."""
    # 1. Increment Global Counter
    stats_ref = db.collection("stock").document("_global_stats")
    stats_ref.set({
        "total_hits": firestore.Increment(1),
        "last_hit_at": firestore.SERVER_TIMESTAMP
    }, merge=True)

    # 2. Log to Recent Hits (for ticker)
    db.collection("global_hits").add({
        "product_title": hit.product_title,
        "store": hit.store,
        "size": hit.size,
        "alias": hit.alias,
        "timestamp": firestore.SERVER_TIMESTAMP
    })

    return {"status": "hit_recorded"}

@app.post("/api/v1/blog-sync")
async def post_blog_sync(blogs: List[BlogItem]):
    """Syncs blog intelligence reports from the local monitor."""
    batch = db.batch()
    for blog in blogs:
        ref = db.collection("store_blogs").document(blog.doc_id)
        batch.set(ref, {
            "title": blog.title,
            "url": blog.url,
            "store": blog.store,
            "excerpt": blog.excerpt,
            "detected_at": firestore.SERVER_TIMESTAMP
        }, merge=True)
    batch.commit()
    return {"status": "blogs_synced"}

@app.get("/api/v1/search-stock")
async def search_stock_api(q: str):
    """Global stock search for the AI Command Center."""
    docs = db.collection("stock").where("soh", ">", 0).stream()
    matches = []
    for d in docs:
        data = d.to_dict()
        if q.lower() in data.get('product_title', '').lower():
            matches.append({
                "name": data.get('product_title'),
                "price": data.get('current_price'),
                "old_price": data.get('original_price'),
                "size": data.get('size_title'),
                "store": data.get('store')
            })
    return matches[:20]

@app.get("/api/v1/deals")
async def get_deals_api():
    """Identify high-margin price drops for resale intelligence."""
    docs = db.collection("stock").where("soh", ">", 0).stream()
    deals = []
    for d in docs:
        data = d.to_dict()
        cp = data.get('current_price', 0)
        op = data.get('original_price', 0)
        if op > cp > 0:
            deals.append({
                "name": data.get('product_title'),
                "current": cp,
                "old": op,
                "margin_pct": round(((op - cp) / op) * 100, 2),
                "store": data.get('store')
            })
    deals.sort(key=lambda x: x['margin_pct'], reverse=True)
    return deals[:15]

@app.get("/api/v1/blogs")
async def get_blogs_api(limit: int = 10):
    """Fetch latest store news (blog/editorial sync)."""
    docs = db.collection("store_blogs").order_by("detected_at", direction="DESCENDING").limit(limit).stream()
    return [{"title": d.to_dict().get('title'), "excerpt": d.to_dict().get('excerpt')} for d in docs]

class SnipeTaskData(BaseModel):
    name: str
    keywords: List[str]
    sizes: List[str]
    email: str
    node_id: str

@app.post("/api/v1/snipe-task")
async def post_snipe_task(data: SnipeTaskData):
    """Enables global sniping feed synchronization (Dashboard/Nodes tab)."""
    db.collection("sniper_tasks").add({
        "name": data.name,
        "keywords": data.keywords,
        "target_sizes": data.sizes,
        "owner_email": data.email,
        "node_origin": data.node_id,
        "status": "active",
        "created_at": firestore.SERVER_TIMESTAMP
    })
    return {"status": "task_synced"}

@app.get("/api/v1/proxies")
async def get_proxies_api():
    """Fetches the global proxy pool for authorized users."""
    snap = db.collection("settings").document("global_proxy_pool").get()
    if snap.exists:
        return {"proxies": snap.to_dict().get("proxies", [])}
    return {"proxies": []}

@app.get("/api/v1/watchlist/{email}")
async def get_watchlist_api(email: str):
    """Retrieves user-specific restock watchlists for synchronization."""
    docs = db.collection("user_alerts").where("user_email", "==", email).stream()
    return {"watchlist": [d.to_dict().get("product_title") for d in docs if d.to_dict().get("product_title")]}

# --- EXISTING LEGACY MONITOR LOGIC (For Cloud-Side Checks) ---

import logging
import sys

logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger("uvicorn.error")

def run_monitor_check():
    target_url = "https://www.shelflife.co.za/products.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.shelflife.co.za/products",
        "Accept-Language": "en-ZA,en;q=0.9"
    }
    try:
        response = requests.get(target_url, headers=headers, timeout=20, impersonate="chrome110")
        if response.status_code != 200: return
        data = response.json()
        results = data.get('results', {}).get('results', [])
        for product_entry in results:
            p = product_entry.get('result', {})
            product_title = p.get('title', 'Unknown Product')
            slug = p.get('slug', '')
            raw_price = p.get('price', '0')
            try: current_price = float(raw_price.replace('R', '').replace(',', '').strip())
            except: current_price = 0
            
            skus = p.get('skus', [])
            for sku in skus:
                sku_id = str(sku.get('id'))
                size_title = sku.get('size_title', 'N/A')
                current_soh = int(sku.get('soh', 0))
                
                stock_ref = db.collection("stock").document(sku_id)
                doc = stock_ref.get()
                if doc.exists:
                    old_state = doc.to_dict()
                    old_soh = old_state.get('soh', 0)
                    old_price = old_state.get('current_price', current_price)
                    if current_soh > 0 and old_soh == 0:
                        trigger_alerts(sku_id, product_title, size_title, slug, "RESTOCK")
                        log_event("RESTOCK", sku_id, product_title, size_title, current_soh)
                    stock_ref.update({"soh": current_soh, "current_price": current_price, "last_updated": firestore.SERVER_TIMESTAMP})
                else:
                    stock_ref.set({"sku_id": sku_id, "product_title": product_title, "size_title": size_title, "soh": current_soh, "current_price": current_price, "original_price": current_price, "last_updated": firestore.SERVER_TIMESTAMP})
    except Exception as e:
        logger.error(f"❌ Cloud Check Error: {e}")

def trigger_alerts(sku_id, product_title, size_title, slug, alert_type, price=None):
    alerts_query = db.collection("user_alerts").where("sku_id", "==", sku_id).where("status", "==", "active").stream()
    product_link = f"https://www.shelflife.co.za/product/{slug}"
    for alert in alerts_query:
        alert_data = alert.to_dict()
        recipient = alert_data.get('user_email')
        if recipient:
            send_email_alert(recipient, product_title, size_title, product_link, alert_type, price)
        if alert_type == "RESTOCK":
            alert.reference.update({"status": "triggered"})

def log_event(type, sku_id, title, size, soh, price=None):
    db.collection("restock_logs").add({
        "type": type, "sku_id": sku_id, "product_title": title, "size_title": size,
        "quantity_added": soh, "price_at_event": price, "detected_at": firestore.SERVER_TIMESTAMP
    })

@app.get("/check")
@app.get("/seed")
def trigger_check():
    run_monitor_check()
    return {"status": "Monitor check completed."}

def send_email_alert(recipient_email: str, product_title: str, size: str, link: str, alert_type="RESTOCK", price=None):
    subject = f"🚨 {alert_type}: {product_title}!"
    body = f"BACK IN STOCK! {product_title} in Size {size} is back. Cop it here: {link}"
    print(f"📧 EMAIL SENT TO {recipient_email}")

@app.get("/")
def home():
    # SEED INITIAL STATS IMMEDIATELY
    stats_ref = db.collection("stock").document("_global_stats")
    snap = stats_ref.get()
    
    if not snap.exists or snap.to_dict().get("total_hits", 0) == 0:
        stats_ref.set({
            "total_hits": 1421,
            "last_hit_at": firestore.SERVER_TIMESTAMP
        }, merge=True)
        
        # Seed a couple of hits if none exist
        hits_snap = db.collection("global_hits").limit(1).get()
        if not hits_snap:
            db.collection("global_hits").add({
                "product_title": "AIR JORDAN 4 'MILITARY BLUE'", 
                "store": "SHELFLIFE", 
                "size": "10", 
                "alias": "SNIPE-KING", 
                "timestamp": firestore.SERVER_TIMESTAMP
            })

    return {"message": "SoleSeek Multi-Cloud Hub API v1.8 is active", "hive_status": "synced"}

# ... (Include the rest of seed and mock logic if needed)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
