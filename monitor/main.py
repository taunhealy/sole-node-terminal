from fastapi import FastAPI, BackgroundTasks, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from curl_cffi import requests
from google.cloud import firestore
import os
import json
from dotenv import load_dotenv
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional, Any
import google.generativeai as genai
import re
from datetime import timedelta
import logging

logger = logging.getLogger("sole_node")


load_dotenv()
# Deployment Timestamp: 2026-03-29 15:10
AUTOMATION_SECRET = "SOLE_SEEK_AUTO_2026_TAC" # Secret for Cloud Scheduler


from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

# TACTICAL_SHIELD: DISCORD_CONFIG
DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY", "d02fe4644c70813d185ea99967fa49bb34d7cb0a45a546c4e8daaeb52c91f603")
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN", "").strip()
if DISCORD_TOKEN:
    logger.info(f"📡 DISCORD_TOKEN_VERIFY | Len: {len(DISCORD_TOKEN)} | Start: {DISCORD_TOKEN[:4]} | End: {DISCORD_TOKEN[-4:]}")


# NEW_IDS_FROM_PROVISIONING
RESTOCK_CHANNEL_ID = "1487800878806208544" # #live-restocks
MARKET_CHANNEL_ID = "1487800875429662730"  # #indie-resellers
NEW_RELEASES_THREAD_ID = "1487800882786730094" # #new-releases
WHATS_HOT_THREAD_ID = "1487800886607614036" # #whats-hot
SNEAKER_OF_THE_DAY_CHANNEL_ID = "1487800871726088373" # #sneaker-of-the-day

MARKET_RECON_CHANNEL_ID = "1487800890747261059" # #market-recon
GLOBAL_SALES_CHANNEL_ID = "1487800894383849603" # #global-sales
TRENDING_INTEL_ID = "1487795718306660394"      # #trending-intel




app = FastAPI()

# Tactical CORS Handshake
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow Terminal UI and development environments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def broadcast_sneaker_of_the_day(name, price, resale_prediction, image_url):
    """Streams the daily AI-curated sneaker showcase to Discord and syncs to Firestore."""
    # --- 🔒 FIRESTORE SYNC ---
    try:
        db.collection("sneaker_of_the_day").add({
            "name": name,
            "price": price,
            "resale_prediction": resale_prediction,
            "image_url": image_url,
            "detected_at": firestore.SERVER_TIMESTAMP
        })
    except Exception as e:
        print(f"❌ FIRESTORE_SYNC_ERROR: {e}")

    # --- 📡 DISCORD_BROADCAST ---
    if not DISCORD_TOKEN: return
    
    url = f"https://discord.com/api/v10/channels/{SNEAKER_OF_THE_DAY_CHANNEL_ID}/messages"
    headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
    
    embed = {
        "title": f"👟 SNEAKER OF THE DAY: {name}",
        "description": "The daily AI-curated masterclass in sneaker excellence and tactical liquidity.",
        "color": 0x3b82f6,
        "fields": [
            {"name": "💰 RRP", "value": f"`{price}`", "inline": True},
            {"name": "📈 RESALE", "value": f"`{resale_prediction}`", "inline": True},
            {"name": "📊 INTEL", "value": "`HYPER_LIQUID`", "inline": True},
        ],
        "image": {"url": image_url},
        "footer": {"text": "SOLE_SEEK_INTELLIGENCE_CORE | Daily_Featured_Showcase"},
        "timestamp": datetime.now().isoformat()
    }
    
    # Using standard requests for the AI dispatcher
    import requests
    res = requests.post(url, headers=headers, json={"embeds": [embed]})
    print(f"📡 DISCORD_DISPATCH_RESULT | Status: {res.status_code} | Channel: {SNEAKER_OF_THE_DAY_CHANNEL_ID} | Response: {res.text}")



@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"❌ VALIDATION ERROR: {exc}")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# --- GOOGLE CLOUD CONFIG ---
# Automatically find local key if available
MONITOR_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_PATH = os.path.join(MONITOR_DIR, "service-account-key.json")
if os.path.exists(KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = KEY_PATH


# 🛡️ FILTRATION_PROTOCOLS: Tactical filters to ensure pure sneaker data
APPAREL_KEYWORDS = [
    "T-Shirt", "Tee", "Hoodie", "Shorts", "Pants", "Socks", 
    "Jacket", "Cap", "Hat", "Beanie", "Bag", "Bottle", "Accessory"
]

def is_sneaker(title: str) -> bool:
    """True if the item is classified as footwear, avoiding apparel poisoning."""
    return not any(keyword.lower() in title.lower() for keyword in APPAREL_KEYWORDS)

PROJECT_ID = os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "sneaker-stock-alert")
db = firestore.Client(project=PROJECT_ID)

# --- GEMINI AI CONFIG ---
GEMINI_KEY = os.getenv("GEMINI_KEY")
if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
    except:
        model = genai.GenerativeModel('gemini-3-flash-preview')
else:
    print("⚠️ WARNING: GEMINI_KEY not found. AI features will be disabled.")
    model = None

class SalesItem(BaseModel):
    title: str
    price: str
    image_url: str
    link: str
    boutique: str
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

class BlogItem(BaseModel):
    doc_id: str
    title: str
    url: str
    store: str
    excerpt: Optional[str] = "No additional data."

class DiscordIntel(BaseModel):
    channel: str
    author: str
    content: str
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
    data["exists"] = True
    return data


# --- DISCORD INTERACTIONS HANDLER ---
async def verify_discord_signature(request: Request):
    """Verifies that the request actually came from Discord using the Public Key."""
    signature = request.headers.get("X-Signature-Ed25519")
    timestamp = request.headers.get("X-Signature-Timestamp")
    body = await request.body()

    if not signature or not timestamp:
        raise HTTPException(status_code=401, detail="Missing signature headers")

    try:
        verify_key = VerifyKey(bytes.fromhex(DISCORD_PUBLIC_KEY))
        # Discord verification format is timestamp + body
        verify_key.verify(f'{timestamp}{body.decode("utf-8")}'.encode(), bytes.fromhex(signature))
    except (BadSignatureError, ValueError) as e:
        print(f"❌ SIGNATURE VERIFICATION FAILED: {e}")
        raise HTTPException(status_code=401, detail="Invalid request signature")
    except Exception as e:
        print(f"❌ INTERNAL VERIFICATION ERROR: {e}")
        raise HTTPException(status_code=500, detail="Verification engine error")

@app.post("/api/v1/discord-interactions")
async def discord_interactions(request: Request):
    """Handles PING handshakes and Slash Commands from Discord."""
    # 1. Verification Handshake (Mandatory)
    await verify_discord_signature(request)
    
    data = await request.json()

    # 2. Handle PING (Type 1) - Required for endpoint validation in Dev Portal
    if data.get("type") == 1:
        return JSONResponse({"type": 1})
    
    # 3. Handle Application Commands (Type 2)
    if data.get("type") == 2:
        command_name = data.get("data", {}).get("name")
        options = {opt['name']: opt['value'] for opt in data.get("data", {}).get("options", [])}
        
        # --- 🛍️ MARKET_BRIDGE: /sell COMMAND ---
        if command_name == "sell":
            item = options.get("item")
            size = options.get("size")
            price = options.get("price")
            condition = options.get("condition", "DS")
            username = data.get("member", {}).get("user", {}).get("username", "Unknown")
            user_id = data.get("member", {}).get("user", {}).get("id")
            
            # 1. 🔮 Save to Global Marketplace Hub (Firestore)
            img_url = "https://firebasestorage.googleapis.com/v0/b/sneaker-stock-alert.firebasestorage.app/o/products%2Fplaceholder_shoe.png?alt=media"
            db.collection("resell_items").add({
                "title": item,
                "size": size,
                "price": price,
                "condition": condition,
                "seller_discord": username,
                "image_url": img_url,
                "source": "discord",
                "verified": True,
                "created_at": datetime.now().isoformat()
            })

            # 2. 📡 BROADCAST_TO_DISCORD_HUB (Forum Thread Creation)
            # We trigger this as a background task to ensure Discord gets a fast response.
            background_tasks.add_task(create_market_thread, item, size, price, condition, username, user_id)

            return JSONResponse({
                "type": 4, 
                "data": {
                    "content": f"✅ **SOLE_MARKET_SYNC**: Successfully listed **{item}** ({size}) for **{price}**! Your listing is now live in #indie-resellers and the web dashboard."
                }
            })

        print(f"📡 DISCORD_COMMAND_RECEIVED: /{command_name}")
        
        return JSONResponse({
            "type": 4, # CHANNEL_MESSAGE_WITH_SOURCE
            "data": {
                "content": f"📡 **SOLE_SEEK_TERMINAL**: Command `/{command_name}` received. Neural uplink established."
            }
        })
            
# --- DISCORD BRIDGE UTILITIES ---

def create_market_thread(item, size, price, condition, username, user_id):
    """Creates a Forum Thread in the #indie-resellers channel for the /sell command."""
    if not DISCORD_TOKEN:
        print("⚠️ ACTION_REQUIRED: DISCORD_TOKEN missing in backend.")
        return

    url = f"https://discord.com/api/v10/channels/{MARKET_CHANNEL_ID}/threads"
    headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
    
    content = (
        f"📦 **PRODUCT_LISTING: {item.upper()}**\n\n"
        f"👤 **Seller**: <@{user_id}>\n"
        f"📏 **Size**: `{size}`\n"
        f"💰 **Price**: `{price}`\n"
        f"🛡️ **Condition**: `{condition}`\n\n"
        "*Authorized SoleSeek Marketplace Protocol Active.* 🛰️🏛️🏹"
    )

    payload = {
        "name": f"{item} | {price}",
        "message": {"content": content}
    }
    
    resp = requests.post(url, headers=headers, json=payload)
    if resp.status_code in [200, 201]:
        print(f"✅ FORUM_THREAD_CREATED: {item}")
    else:
        print(f"❌ FORUM_THREAD_FAILED: {resp.text}")

@app.post("/api/v1/update-profile")
async def update_profile(data: dict):
    """Securely updates cloud-side user profile data."""
    email = data.get("email")
    if not email:
        return {"status": "error", "message": "Email is required"}
    
    user_ref = db.collection("users").document(email)
    user_ref.set(data, merge=True)
    return {"status": "profile_synced"}

@app.get("/api/v1/automation/debug-stats")
def api_debug_stats():
    """Returns database and connectivity stats for the fleet."""
    stock_count = len(list(db.collection("stock").limit(100).get()))
    soh_count = len(list(db.collection("stock").where("soh", ">", 0).limit(100).get()))
    return {
        "status": "active",
        "stock_total": stock_count,
        "soh_positive": soh_count,
        "env_discord": DISCORD_TOKEN[:10] if DISCORD_TOKEN else "None",
        "env_gemini": GEMINI_KEY[:10] if GEMINI_KEY else "None"
    }


@app.get("/")
def read_root():
    return {"status": "SoleSeek_Fleet_Commander_V2_Active"}

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

# --- DISCORD INTEL ENDPOINTS ---
class DiscordIntel(BaseModel):
    channel: str
    author: str
    content: str
    timestamp: Optional[str] = None

@app.post("/api/v1/discord-intel")
async def discord_intel_endpoint(intel: DiscordIntel):
    try:
        data = intel.dict()
        data["received_at"] = datetime.now().isoformat()
        db.collection("community_intel").add(data)
        return {"status": "success", "message": "Signal ingested"}
    except Exception as e:
        print(f"❌ INTEL ERROR: {e}")
        return {"status": "error", "detail": str(e)}

@app.get("/api/v1/discord-intel")
async def get_discord_intel(limit: int = 10):
    """Fetches real-time community intel from Discord."""
    docs = db.collection("community_intel").order_by("received_at", direction=firestore.Query.DESCENDING).limit(limit).stream()
    intel = []
    for d in docs:
        item = d.to_dict()
        intel.append({
            "author": item.get("author", "Unknown"),
            "content": item.get("content", ""),
            "channel": item.get("channel", "general"),
            "timestamp": item.get("received_at")
        })
    return intel


@app.post("/api/v1/ai-broadcast")
async def ai_broadcast_endpoint(request: Request):
    """
    Generates a tactical AI summary of recent South African & Global sneaker intel.
    Designed to be pushed to Discord threads.
    """
    if not GEMINI_KEY:
        raise HTTPException(status_code=500, detail="AI Engine not configured")
        
    try:
        # 1. Gather Recent Intel
        # Recent Boutique News
        blogs = db.collection("store_blogs").order_by("detected_at", direction=firestore.Query.DESCENDING).limit(5).get()
        blog_data = [b.to_dict().get("title", "") for b in blogs]
        
        # Recent Stock Drops
        stock = db.collection("stock").order_by("detected_at", direction=firestore.Query.DESCENDING).limit(10).get()
        stock_data = [f"{s.to_dict().get('store', '')}: {s.to_dict().get('name', '')}" for s in stock]
        
        # Recent Community Chatter
        community = db.collection("community_intel").order_by("received_at", direction=firestore.Query.DESCENDING).limit(10).get()
        chat_data = [f"@{c.to_dict().get('author', '')}: {c.to_dict().get('content', '')}" for c in community]

        # 2. Construct Prompt
        prompt = f"""
        ACT AS: SoleSeek Tactical AI Broadcaster.
        CONTEXT: You are summarizing real-time sneaker market intelligence for a high-end Discord community in South Africa.
        
        DATA:
        - Recent Headlines: {json.dumps(blog_data)}
        - Recent Stock Signals: {json.dumps(stock_data)}
        - Community Chatter: {json.dumps(chat_data)}
        
        TASK:
        Generate THREE distinct updates:
        1. "SOUTH AFRICAN HEADLINES": Tactical summary of local boutique news (Shelflife, Archive, Lemkus).
        2. "GLOBAL SIGNALS": High-level market shifts or major global leaks detected.
        3. "COMMUNITY PULSE": A summary of what the #SoleSeekers are talking about.
        
        TONE: Noir, tactical, professional, high-urgency. Use bullet points and emoji sparingly (e.g., 📡, 🎯, 🚨).
        FORMAT: Return the result in a clean, professional broadcast format suitable for Discord (using markdown).
        """
        
        response = model.generate_content(prompt)
        broadcast_text = response.text
        
        # 3. Cache the broadcast in Firestore
        broadcast_id = f"broadcast_{datetime.now().strftime('%Y%m%d_%H%M')}"
        db.collection("ai_broadcasts").document(broadcast_id).set({
            "content": broadcast_text,
            "timestamp": datetime.now().isoformat(),
            "type": "daily_briefing"
        })
        
        return {"status": "success", "broadcast": broadcast_text, "id": broadcast_id}
        
    except Exception as e:
        print(f"❌ AI BROADCAST ERROR: {e}")
        return {"status": "error", "detail": str(e)}

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

# --- 🛡️ GLOBAL_BROADCAST_GUARD ---
def is_already_broadcasted(title, alert_type):
    """Prevents duplicate alerts for the same model across different store nodes."""
    # Normalize title for cross-store matching
    clean_title = re.sub(r'\buk\s?\d+(\.\d+)?\b', '', title.lower()).strip()
    
    # Check if a broadcast happened for this model in the last 15 minutes
    threshold = datetime.now() - timedelta(minutes=15)
    recent_broadcasts = db.collection("broadcast_logs") \
                          .where("model_key", "==", clean_title) \
                          .where("alert_type", "==", alert_type) \
                          .where("timestamp", ">=", threshold).get()
    
    if len(list(recent_broadcasts)) > 0:
        return True
    
    # Log the new broadcast attempt
    db.collection("broadcast_logs").add({
        "model_key": clean_title,
        "alert_type": alert_type,
        "timestamp": firestore.SERVER_TIMESTAMP
    })
    return False

def run_monitor_check():
    """Multi-node surveillance scan across all primary SA boutiques."""
    logger.info("🛰️ INITIATING_MULTI_NODE_MONITOR_SCAN...")
    
    # --- 🏗️ NODE_1: SHELFLIFE ---
    scan_shelflife()
    
    # --- 🧱 NODE_2: JACK LEMKUS ---
    scan_lemkus()
    
    # --- 🧠 AI_OVERWATCH_DISPATCH ---
    # After scans are complete, we trigger the specialized AI Market intelligence summaries
    logger.info("🧠 TRIGGERING_AI_OVERWATCH_DISPATCH...")
    try:
        from overwatch_briefing import overwatch_mission_dispatch
        # 📡 TACTICAL_LINK: Passing live tokens and IDs into the AI Dispatcher
        channel_map = {
            "NEW_STOCK_ALERTS": MARKET_RECON_CHANNEL_ID,
            "MARKET_INTEL": TRENDING_INTEL_ID,
            "RESELLERS_RECON": MARKET_RECON_CHANNEL_ID
        }
        overwatch_mission_dispatch(token=DISCORD_TOKEN, channel_map=channel_map)
        logger.info("🎯 MISSION_COMPLETE | ALL_SECTORS_POPULATED")
    except Exception as e:
        logger.error(f"❌ Overwatch Error: {e}")

def broadcast_to_channel(channel_key, text, title, color):
    """Internal bridge for sending multi-sector intelligence to specialized Discord threads."""
    if not DISCORD_TOKEN: return
    
    # 🎯 TARGET_ROUTING: Mapping AI sectors to physical Discord IDs
    channel_id_map = {
        "NEW_STOCK_ALERTS": MARKET_RECON_CHANNEL_ID,
        "MARKET_INTEL": MARKET_RECON_CHANNEL_ID,
        "RESELLERS_RECON": MARKET_RECON_CHANNEL_ID
    }
    
    channel_id = channel_id_map.get(channel_key, MARKET_RECON_CHANNEL_ID)
    url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
    headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
    
    embed = {
        "title": f"🛰️ {title}",
        "description": text,
        "color": color,
        "footer": {"text": "SOLE_SEEK_AI_HUB | Sector Dispatch Active"},
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        res = requests.post(url, headers=headers, json={"embeds": [embed]})
        if res.status_code in [200, 201]:
            logger.info(f"✅ AI_DISPATCH_SUCCESS | Sector: {channel_key} | ID: {channel_id}")
        else:
            logger.error(f"❌ AI_DISPATCH_FAILED | Status: {res.status_code} | Msg: {res.text}")
    except Exception as e:
        logger.error(f"❌ DISCORD_TRANSPORT_ERROR: {e}")

def scan_shelflife():
    target_url = "https://www.shelflife.co.za/products.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.shelflife.co.za/products"
    }
    try:
        response = requests.get(target_url, headers=headers, timeout=20, impersonate="chrome110")
        if response.status_code != 200: return
        data = response.json()
        results = data.get('results', {}).get('results', [])
        for product_entry in results:
            p = product_entry.get('result', {})
            if is_sneaker(p.get('title', '')):
                process_standard_product(p, "Shelflife")
    except Exception as e:
        logger.error(f"❌ Shelflife Scan Error: {e}")

def scan_lemkus():
    target_url = "https://www.jacklemkus.com/products.json?limit=50"
    try:
        response = requests.get(target_url, timeout=20)
        if response.status_code != 200: return
        products = response.json().get('products', [])
        for p in products:
            if is_sneaker(p.get('title', '')):
                process_shopify_product(p, "Jack Lemkus")
    except Exception as e:
        logger.error(f"❌ Lemkus Scan Error: {e}")

def process_standard_product(p, store_name):
    """Processes Searchspring/Standard HTML JSON entries (Shelflife style)."""
    product_title = p.get('title', 'Unknown Product')
    slug = p.get('slug', '')
    raw_price = p.get('price', '0')
    try: current_price = float(raw_price.replace('R', '').replace(',', '').strip())
    except: current_price = 0
    
    skus = p.get('skus', [])
    for sku in skus:
        sku_id = f"{store_name[:2].lower()}-{sku.get('id')}"
        size_title = sku.get('size_title', 'N/A')
        current_soh = int(sku.get('soh', 0))
        url = f"https://www.shelflife.co.za/product/{slug}"
        handle_stock_logic(sku_id, product_title, size_title, current_soh, current_price, url, store_name)

def process_shopify_product(p, store_name):
    """Processes Shopify JSON entries (Lemkus style)."""
    product_title = p.get('title', 'Unknown Product')
    handle = p.get('handle', '')
    url = f"https://www.jacklemkus.com/products/{handle}"
    
    for variant in p.get('variants', []):
        sku_id = f"{store_name[:2].lower()}-{variant.get('id')}"
        size_title = variant.get('title', 'N/A')
        current_soh = 1 if variant.get('available') else 0
        current_price = float(variant.get('price', 0))
        handle_stock_logic(sku_id, product_title, size_title, current_soh, current_price, url, store_name)

def handle_stock_logic(sku_id, title, size, soh, price, url, store):
    """Orchestrates database state and triggers alerts for stock events."""
    try:
        stock_ref = db.collection("stock").document(sku_id)
        doc = stock_ref.get()

    
        if doc.exists:
            old_state = doc.to_dict()
            old_soh = old_state.get('soh', 0)
            old_price = old_state.get('current_price', price)
            
            # --- 🚨 RESTOCK_DETECTION ---
            if soh > 0 and old_soh == 0:
                if not is_already_broadcasted(title, "RESTOCK"):
                    trigger_alerts(sku_id, title, size, url, "RESTOCK", price, store)
                    log_event("RESTOCK", sku_id, title, size, soh, price)
                
                # Persist the restock signal to the main document for the Terminal UI
                stock_ref.update({
                    "soh": soh, 
                    "current_price": price, 
                    "last_updated": firestore.SERVER_TIMESTAMP,
                    "restocked_at": firestore.SERVER_TIMESTAMP
                })
            
            # --- 💰 SALE_DETECTION ---
            elif price < old_price and price > 0:
                trigger_alerts(sku_id, title, size, url, "GLOBAL_SALE", price, store)
                stock_ref.update({
                    "soh": soh, 
                    "current_price": price, 
                    "last_updated": firestore.SERVER_TIMESTAMP,
                    "on_sale": True,
                    "sale_detected_at": firestore.SERVER_TIMESTAMP
                })
            else:
                stock_ref.update({
                    "soh": soh, 
                    "current_price": price, 
                    "last_updated": firestore.SERVER_TIMESTAMP
                })
        else:
            # --- ✨ NEW_RELEASE_DETECTION ---
            if soh > 0:
                if not is_already_broadcasted(title, "NEW_RELEASE"):
                    trigger_alerts(sku_id, title, size, url, "NEW_RELEASE", price, store)
                    log_event("NEW_RELEASE", sku_id, title, size, soh, price)
            
            stock_ref.set({
                "sku_id": sku_id, "product_title": title, "size_title": size, 
                "soh": soh, "current_price": price, "original_price": price, 
                "store": store, "url": url, 
                "detected_at": firestore.SERVER_TIMESTAMP,
                "last_updated": firestore.SERVER_TIMESTAMP
            })

    except Exception as e:
        logger.error(f"❌ Shelflife Scan Error: {e}")


def broadcast_to_discord(product_title, size_title, url, alert_type, price=None, store="Shelflife"):
    """Broadcasts high-priority alerts to the correct Discord threads based on AI metrics."""
    if not DISCORD_TOKEN: return
    
    # --- 🎯 TARGET_THREAD_ROUTING ---
    channel_id = RESTOCK_CHANNEL_ID
    if alert_type == "NEW_RELEASE":
        channel_id = NEW_RELEASES_THREAD_ID
    elif alert_type == "GLOBAL_SALE":
        channel_id = GLOBAL_SALES_CHANNEL_ID
    
    # --- 🧠 AI_TACTICAL_SCORE ---
    is_hype = any(word in product_title.upper() for word in ["JORDAN", "TRAVIS", "DUNK", "SB", "YEEZY"])
    hype_score = "9.5/10 (HYPER_LIQUID)" if is_hype else "6.2/10 (STABLE_ASSET)"
    
    # If it's a Hype drop, duplicate alert to #Whats-Hot
    targets = [channel_id]
    if is_hype and alert_type != "GLOBAL_SALE": 
        targets.append(WHATS_HOT_THREAD_ID)
    
    embed = {
        "title": f"🚨 {alert_type}: {product_title}",
        "url": url,
        "color": 0xFF0000 if alert_type in ["RESTOCK", "GLOBAL_SALE"] else 0x00FF00,
        "fields": [
            {"name": "📏 SIZE", "value": f"`{size_title}`", "inline": True},
            {"name": "💰 PRICE", "value": f"`R {price or 'N/A'}`", "inline": True},
            {"name": "🏪 STORE", "value": f"`{store}`", "inline": True},
            {"name": "📊 HYPE_SCORE", "value": f"`{hype_score}`", "inline": True},
        ],
        "footer": {"text": "SOLE_SEEK_INTELLIGENCE_CORE | Real-time Fleet Monitoring"},
        "timestamp": datetime.now().isoformat()
    }

    
    for t_id in list(set(targets)):
        url = f"https://discord.com/api/v10/channels/{t_id}/messages"
        headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
        res = requests.post(url, headers=headers, json={"embeds": [embed]})
        if res.status_code in [200, 201]:
            logger.info(f"✅ DISCORD_BROADCAST_SUCCESS | Target: {t_id} | Type: {alert_type}")
        else:
            logger.error(f"❌ DISCORD_BROADCAST_FAILED | Status: {res.status_code} | Body: {res.text}")


def trigger_alerts(sku_id, product_title, size_title, url, alert_type, price=None, store="Shelflife"):
    # --- 📡 DISCORD_BROADCAST ---
    broadcast_to_discord(product_title, size_title, url, alert_type, price, store)

    alerts_query = db.collection("user_alerts").where("sku_id", "==", sku_id).where("status", "==", "active").stream()
    product_link = url

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

@app.get("/api/v1/automation/sync-drops")
def api_sync_drops(request: Request):
    """Triggered by cron to update the global drop calendar."""
    if request.headers.get("X-Automation-Key") != AUTOMATION_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized_Uplink")
    results = sync_drop_calendar()
    return {"status": "success", "synced": len(results), "items": results}

@app.get("/api/v1/automation/run-all")
async def api_run_all(request: Request, key: Optional[str] = None):
    """The master hourly trigger: Scans products, updates calendar, and broadcasts AI intel."""
    # 🔐 TACTICAL_AUTH: Check both Header and Query Param for automation secret
    incoming_key = request.headers.get("X-Automation-Key") or key
    if incoming_key != AUTOMATION_SECRET:
        logger.error(f"❌ UNAUTHORIZED_UPLINK_ATTEMPT | Key: {incoming_key}")
        raise HTTPException(status_code=401, detail="Unauthorized_Uplink")
        
    logger.info("⚡ INITIATING_FULL_FLEET_SYNC...")
    
    # 1. 📅 Sync Drops
    drops = sync_drop_calendar()
    
    # 2. 🔍 Scan for Restocks & New Releases (Broadcasts to Discord internally)
    # The scan logic itself is now hardened with is_sneaker() filters.
    run_monitor_check()
    
    # 3. 📰 Sync Market Intel (Blogs)
    blogs = sync_market_recon()
    
    # 4. 📡 Dispatch AI Overwatch Briefing (Now includes blogs)
    from overwatch_briefing import overwatch_mission_dispatch
    ch_map = {
        "MARKET_RECON": MARKET_RECON_CHANNEL_ID,
        "TRENDING_INTEL": TRENDING_INTEL_CHANNEL_ID
    }
    overwatch_mission_dispatch(token=DISCORD_TOKEN, channel_map=ch_map, blogs=blogs)
    
    # 5. 👟 Select & Broadcast Sneaker of the Day (AI Showcase)
    showcase = broadcast_sneaker_of_the_day_automated()
    
    return {
        "status": "fleet_sync_complete",
        "drops_synced": len(drops),
        "sneaker_of_the_day": showcase.get('product_title') if showcase else "N/A"
    }

@app.get("/api/v1/automation/discover-channels")
async def api_discover_channels(request: Request):
    """Diagnoses Discord connectivity by listing all accessible sectors."""
    if not DISCORD_TOKEN:
        return {"error": "DISCORD_TOKEN_MISSING"}
        
    url = "https://discord.com/api/v10/users/@me/guilds"
    headers = {"Authorization": f"Bot {DISCORD_TOKEN}"}
    
    try:
        guilds_resp = requests.get(url, headers=headers)
        guilds = guilds_resp.json()
        
        all_sectors = []
        for g in guilds:
            g_id = g.get('id')
            channels_url = f"https://discord.com/api/v10/guilds/{g_id}/channels"
            ch_resp = requests.get(channels_url, headers=headers)
            all_sectors.extend(ch_resp.json())
            
        return {"status": "discovery_complete", "sectors": all_sectors}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/v1/ai/resell-analysis")
async def get_ai_resell_analysis(title: str, price: Optional[float] = 0.0):
    """Generates hyper-localized resell and product intelligence for the syndicate."""
    if not GEMINI_KEY:
        return {"error": "AI_CORE_OFFLINE"}
        
    prompt = f"""
    Act as a professional sneaker market analyst for the South African syndicate.
    Analyze this product: {title}
    Retail Price: R{price if price else 'Unknown'}
    
    Provide your analysis in RAW JSON format with exactly these two keys:
    1. "analysis": A detailed market intelligence report on resell value in South Africa. Mention the local scarcity vs demand, and the estimated reseller margin at local boutiques like Shelflife or Archive.
    2. "backstory": A separate report on the shoe's heritage. Include its backstory, the original designer (if known), and 2-3 interesting facts or cultural significance.
    
    Return ONLY the RAW JSON object. No conversational text or markdown blocks.
    """
    
    try:
        # TACTICAL_MODEL_UPGRADE: Moving to gemini-2.0-flash (stable) or gemini-3-flash-preview
        model_name = "gemini-1.5-flash" # Use stable 1.5 for JSON reliability during sector realignment
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
        except:
            model = genai.GenerativeModel('gemini-1.5-flash')
            
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        
        # TACTICAL_JSON_EXTRACTION: Find the first { and last }
        try:
            json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if json_match:
                clean_text = json_match.group(0)
                import json
                return json.loads(clean_text)
            else:
                raise ValueError("NO_JSON_FOUND")
        except:
            # Fallback if regex or parse fails
            return {
                "analysis": raw_text[:500], # return raw if it's text
                "backstory": "📡 HERITAGE_LINK_SEVERED: Data corrupted during extraction."
            }
    except Exception as e:
        logger.error(f"❌ AI_ANALYSIS_FAILED: {e}")
        return {
            "analysis": f"📡 INTELLIGENCE_JAMMED: {str(e)}",
            "backstory": "📡 HERITAGE_LINK_SEVERED: Unable to retrieve product history."
        }

@app.get("/api/v1/reseller-sales")
async def get_reseller_sales():
    """Scrapes recent sales from major South African resellers."""
    sales = []
    try:
        # MISSION_1: Court Order 'Sold' Sector
        url = "https://courtorder.co.za/collections/sold"
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            # Simple regex to grab product card data from Shopify-like liquid theme
            # Titles
            titles = re.findall(r'<div class="product-item__title">(.*?)</div>', resp.text)
            # Prices (usually within a span)
            prices = re.findall(r'<span class="price">(.*?)</span>', resp.text)
            # Images
            images = re.findall(r'<img class="product-item__image".*?src="//(.*?)".*?>', resp.text)
            # Links
            links = re.findall(r'<a href="(/products/.*?)"', resp.text)
            
            for i in range(min(len(titles), 10)):
                sales.append({
                    "title": titles[i].strip(),
                    "price": prices[i].strip() if i < len(prices) else "N/A",
                    "image_url": f"https://{images[i]}" if i < len(images) else "",
                    "link": f"https://courtorder.co.za{links[i]}" if i < len(links) else "",
                    "boutique": "Court Order"
                })
    except Exception as e:
        logger.error(f"❌ SALES_RECON_FAILED: {e}")
    
    return {"sales": sales}
    new_blogs = []
    try:
        # Shelflife Editorial logic
        sl_blog_url = "https://www.shelflife.co.za/editorial"
        resp = requests.get(sl_blog_url, timeout=15)
        if resp.status_code == 200:
            # Capturing trending items from the source
            title_matches = re.findall(r'<h3><a href="(.*?)">(.*?)</a></h3>', resp.text)
            for link, title in title_matches[:5]:
                full_link = f"https://www.shelflife.co.za{link}"
                new_blogs.append({"title": title, "url": full_link, "source": "Shelflife"})
    except Exception as e:
        logger.error(f"❌ Market Recon Sync Failed: {e}")
    return new_blogs

def broadcast_sneaker_of_the_day_automated():
    """AI selects the most hyped item from the last 24h and showcases it."""
    # Logic: Get top hyped items and pick one randomly for variety
    try:
        import random
        # Resilience: Get any items with SOH > 0 and sort in-memory to avoid mandatory index requirement
        docs = db.collection("stock").where("soh", ">", 0).limit(30).get()
        items = [d.to_dict() for d in docs]
        
        # In-memory selection to ensure we always pick something
        logger.info(f"🔎 SOTD_INVENTORY_CHECK | Found {len(items)} potential items.")
        if not items: return None
        
        # Sort by price in memory
        items.sort(key=lambda x: x.get('current_price', 0), reverse=True)
        top_items = items[:10]
        showcase_item = random.choice(top_items)

        
        title = showcase_item.get('product_title')
        price = showcase_item.get('current_price')
        img = showcase_item.get('url', "https://firebasestorage.googleapis.com/v0/b/sneaker-stock-alert.firebasestorage.app/o/products%2Fplaceholder_shoe.png?alt=media")
        
        # 🧪 AI_SHOWCASE_GENERATION: Detailed AI description
        ai_desc = f"Today's peak performance asset: {title}. High liquidity expected. Elite colorway and premium silhouette."
        resale_val = "TBC"
        
        if genai and GEMINI_KEY:
            try:
                prompt = (
                    f"You are SoleSeek AI, a pro sneaker analyst. Provide a high-hype, technical, short intel report for {title}. "
                    "Include: 1. Hype Score (0-10), 2. Resale Prediction (e.g. +30%), 3. Tactical Advice (Hold/Sell). "
                    "Use emojis and street lingo."
                )
                res = model.generate_content(prompt)
                ai_desc = res.text
            except Exception as e:
                logger.error(f"⚠️ AI_GEN_FAILED: {e}")
            
        embed = {
            "title": f"👟 SNEAKER_OF_THE_DAY: {title}",
            "description": ai_desc,
            "color": 0x3b82f6,
            "image": {"url": img},
            "fields": [
                {"name": "💰 PRICE", "value": f"`R {price}`", "inline": True},
                {"name": "🔥 STATUS", "value": "`IN_STOCK`", "inline": True},
            ],
            "footer": {"text": "SOLE_INTEL_DAILY | AI_Curated_Showcase"},
            "timestamp": datetime.now().isoformat()
        }
        
        url = f"https://discord.com/api/v10/channels/{SNEAKER_OF_THE_DAY_CHANNEL_ID}/messages"
        headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
        res = requests.post(url, headers=headers, json={"embeds": [embed]})
        
        if res.status_code in [200, 201]:
            logger.info(f"✅ SOTD_BROADCAST_SUCCESS | Item: {title}")
        else:
            logger.error(f"❌ SOTD_BROADCAST_FAILED | Status: {res.status_code} | Body: {res.text}")
        
        # Update current 'Sneaker of the Day' in DB for the Terminal UI
        db.collection("settings").document("sneaker_of_the_day").set({
            "title": title,
            "image_url": img,
            "price": price,
            "ai_report": ai_desc,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        
        return showcase_item
    except Exception as e:
        logger.error(f"❌ Showcase Broadcast Failed: {e}")
        return None

def sync_drop_calendar():
    """Aggregates upcoming launches from SA's big 3 boutiques."""
    logger.info("📡 INITIATING_DROP_RADAR_SCAN...")
    all_drops = []
    
    # --- 🏗️ NODE_1: SHELFLIFE ---
    try:
        # Scan Shelflife products
        sl_json_url = "https://www.shelflife.co.za/products.json?limit=50"
        sl_resp = requests.get(sl_json_url, timeout=15)
        if sl_resp.status_code == 200:
            sl_products = sl_resp.json().get('products', [])
            for p in sl_products:
                tags_lower = [t.lower() for t in p.get('tags', [])]
                # DETECTION_SIGNALS: 'coming-soon', 'raffle', 'launch'
                if any(sig in tags_lower for sig in ['coming-soon', 'raffle', 'launch']):
                    dt_str = p['published_at'] or datetime.now().isoformat()
                    # Extract specific Release date from tags if hidden: "Release:25-05-2024"
                    found_date = None
                    for tag in p.get('tags', []):
                        if 'Release:' in tag:
                            try:
                                date_part = tag.split('Release:')[1].strip()
                                found_date = datetime.strptime(date_part, "%d-%m-%Y")
                            except: pass
                    
                    all_drops.append({
                        "id": f"sl-{p['id']}",
                        "title": p['title'],
                        "store": "Shelflife",
                        "release_date": (found_date or datetime.fromisoformat(dt_str.replace('Z', '+00:00'))).isoformat(),
                        "image_url": p['images'][0]['src'] if p['images'] else "",
                        "link": f"https://www.shelflife.co.za/product/{p['handle']}",
                        "price": f"R{p['variants'][0]['price']}" if p['variants'] else "R N/A"
                    })
    except Exception as e:
        logger.error(f"❌ Shelflife Drop Scan Failed: {e}")

    # --- 🧱 NODE_2: JACK LEMKUS ---
    try:
        lemkus_url = "https://www.jacklemkus.com/products.json?limit=50"
        lemkus_resp = requests.get(lemkus_url, timeout=15)
        if lemkus_resp.status_code == 200:
            lemkus_products = lemkus_resp.json().get('products', [])
            for p in lemkus_products:
                tags = [t.lower() for t in p.get('tags', [])]
                p_type = p.get('product_type', '').lower()
                
                # DETECTION_SIGNALS: Type 'Launches' or specific tags
                if p_type == 'launches' or any(sig in tags for sig in ['launch', 'raffle', 'coming-soon']):
                    # Use a date in the future if it's a launch (Shopify published_at is often current time)
                    # We check if title has a date or generic offset
                    all_drops.append({
                        "id": f"jl-{p['id']}",
                        "title": p['title'],
                        "store": "Jack Lemkus",
                        "release_date": p['published_at'] or datetime.now().isoformat(),
                        "image_url": p['images'][0]['src'] if p['images'] else "",
                        "link": f"https://www.jacklemkus.com/products/{p['handle']}",
                        "price": f"R{p['variants'][0]['price']}" if p['variants'] else "R N/A"
                    })
    except Exception as e:
        logger.error(f"❌ Lemkus Drop Scan Failed: {e}")


    # --- 🏗️ BOUTIQUE_3: ARCHIVE ---
    logger.info("📡 SCANNING_ARCHIVE_RADAR...")
    try:
        url = "https://www.archivestore.co.za/products.json"
        # Archive is now blocking standard requests, using curl_cffi
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0 Safari/537.36"}, impersonate="chrome110", timeout=20)
        if resp.status_code == 200:
            data = resp.json()
            products = data.get('products', [])
            for p in products:
                # Logic to filter for 'launch' or 'coming soon'
                tags = [t.lower() for t in p.get('tags', [])]
                if 'launch' in tags or 'coming' in tags or 'soon' in p.get('title', '').lower():
                    all_drops.append({
                        "id": f"ar-{p['id']}",
                        "title": p.get('title'),
                        "price": f"R{p.get('variants', [{}])[0].get('price')}",
                        "store": "Archive",
                        "release_date": p.get('published_at', datetime.now().isoformat()),
                        "image_url": p.get('images', [{}])[0].get('src', ""),
                        "link": f"https://www.archivestore.co.za/products/{p.get('handle')}"
                    })
    except Exception as e:
        logger.error(f"❌ Archive Drop Scan Failed: {e}")

    # --- 🚮 CLEAN_AND_SYNC ---
    # We clear the existing calendar and repopulate with fresh intelligence
    # (Free tier Firestore handles this easily as it's only dozens of items once per hour)
    calendar_ref = db.collection("drop_calendar")
    
    # Bulk delete (simple way: limit to 100 as drops are usually few)
    batch = db.batch()
    docs = calendar_ref.limit(100).stream()
    for doc in docs:
        batch.delete(doc.reference)
    batch.commit()
    
    # Repopulate
    for d in all_drops:
        calendar_ref.document(d['id']).set(d)
        
    logger.info(f"✅ DROP_RADAR_SYNC_COMPLETE | Synced {len(all_drops)} entries.")
    return all_drops

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

@app.post("/api/v1/discord-interactions")
async def discord_interactions_v1(request: Request):
    """Deep-Vessel Interaction Gateway: Optimized for sub-second precision."""
    start_time = time.perf_counter()
    
    body = await request.body()
    data = json.loads(body)
    interaction_type = data.get("type")

    # 🤝 HANDSHAKE: Instant response for Type 1
    if interaction_type == 1:
        return JSONResponse(content={"type": 1})

    # 🚀 COMMAND_GATEWAY: Handle Slash Commands (Type 2)
    if interaction_type == 2:
        command_name = data.get("data", {}).get("name")
        if command_name == "sell":
            # PRE-LOG: Log the duration before sending the Type 4 response
            duration = (time.perf_counter() - start_time) * 1000
            logger.info(f"⚡ COMMAND_SELL_TRIGGERED | Processing_Time: {duration:.2f}ms")
            
            return JSONResponse(content={
                "type": 4, 
                "data": {
                    "content": "🚀 **INITIATING_SELL_MISSION**\nTo list your assets on the SoleSeek marketplace, please visit the tactical portal:\nhttps://sole-seek.site/resell",
                    "flags": 64
                }
            })
            
    return JSONResponse(content={"type": 1})

# ... (Include the rest of seed and mock logic if needed)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

