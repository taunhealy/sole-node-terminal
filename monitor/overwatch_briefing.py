import os
import requests
import json
from datetime import datetime, timedelta
import google.generativeai as genai
from google.cloud import firestore
from dotenv import load_dotenv

# SOLE_SEEK_OVERWATCH: AI MISSION CONTROL (MULTI-DISPATCH)
# This script performs 4 specialized market scans and broadcasts unique intelligence.

# Load env from root
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

# Init Firebase
CRED_PATH = os.path.join(os.path.dirname(__file__), "service-account-key.json")
if os.path.exists(CRED_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CRED_PATH
else:
    print(f"⚠️ Service account key not found at {CRED_PATH}")
db = firestore.Client()

# Init Gemini
GEMINI_KEY = os.getenv("NEXT_PUBLIC_GEMINI_API_KEY")
genai.configure(api_key=GEMINI_KEY)

# Adaptive Model Selection
try:
    available_models = [m.name for m in genai.list_models() if 'flash' in m.name]
    model_name = available_models[0] if available_models else 'models/gemini-pro'
    print(f"📡 AI_HUB_INITIALIZED: Using {model_name}")
    model = genai.GenerativeModel(model_name)
except Exception as e:
    print(f"❌ AI_INITIALIZATION_ERROR: {e}")
    model = genai.GenerativeModel('gemini-pro')

# Discord Config
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CHANNELS = {
    "TRENDING_INTEL": "1487593576555876444",
    "NEW_STOCK_ALERTS": "1487620217826836566",
    "MARKET_INTEL": "1487620222297837681",
    "EARLY_ACCESS_INTEL": "1487620227389849602",
    "RESELLERS_RECON": "1487620231282294866"
}

def fetch_restock_data():
    """Retrieves the last 15 minutes of stock activity for AI analysis."""
    threshold = datetime.now() - timedelta(minutes=15)
    docs = db.collection("restock_logs").where("detected_at", ">=", threshold).limit(10).get()
    
    # Returning enriched objects for better AI context
    intel_pool = []
    for d in docs:
        data = d.to_dict()
        # Attempt to find the core product record for the URL
        sku_id = data.get("sku_id")
        p_doc = db.collection("stock").document(sku_id).get()
        url = p_doc.to_dict().get("url", "#") if p_doc.exists else "#"
        
        intel_pool.append({
            "name": data.get("product_title"),
            "store": data.get("store", "Boutique"),
            "url": url,
            "type": data.get("type", "RESTOCK")
        })
        
    return intel_pool

def generate_multi_dispatch_intel(logs, blogs=None):
    """Generates 3 unique intelligence reports based on market and blog data."""
    prompt = f"""
    ACT AS: SoleSeek Intelligence Commander.
    CONTEXT: You are drafting tactical Discord briefings for an elite sneaker syndicate in South Africa.
    
    RESTOCK_DATA (JSON format with URLs):
    {json.dumps(logs, indent=2)}
    
    MARKET_EDITORIALS (Live Boutique Blogs):
    {json.dumps(blogs if blogs else [], indent=2)}
    
    MISSION_OBJECTIVE:
    Generate THREE distinct briefings.
    1. "NEW_STOCK_ALERTS": Highlight the most liquid restocks. **LINK EVERYTHING.**
    2. "MARKET_INTEL": Synthesize the MARKET_EDITORIALS (blogs) and RESTOCK_DATA to predict moves. Focus on trends like 'Adifom', 'Retro Basketball', or 'Dunk Saturations'. **LINK THE BLOG TITLES.**
    3. "RESELLERS_RECON": Tactical buy/wait advice.
    
    TONE: Noir, Technical, Professional. Use bullet points.
    FORMAT: Return a JSON dictionary with keys "NEW_STOCK_ALERTS", "MARKET_INTEL", and "RESELLERS_RECON".
    
    CRITICAL: Every product or blog mentioned MUST be hyperlinked using the format [Title](URL).
    """

    try:
        response = model.generate_content(prompt)
        text = response.text
        # Clean potential markdown from AI response
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception as e:
        print(f"❌ AI_GEN_ERROR: {e}")
        return {
            "NEW_STOCK_ALERTS": "📡 **SURVEILLANCE_PULSE**: No new restocks detected. Fleet maintaining holding pattern.",
            "MARKET_INTEL": "📡 **MARKET_RECON**: Localized boutique activity remains stable.",
            "RESELLERS_RECON": "📡 **RESELLERS_RECON**: No high-frequency trade signals detected."
        }

def overwatch_mission_dispatch(token=None, channel_map=None, blogs=None):
    """Master entry point for AI fleet intelligence broadcasting."""
    global DISCORD_TOKEN
    if token:
        DISCORD_TOKEN = token
        
    print("📡 INITIATING_MULTI_SECTOR_INTELLIGENCE_DISPATCH...")
    try:
        logs = fetch_restock_data()
        
        # 🧪 MISSION_PLANNING: Generate intel based on data sector
        briefings = generate_multi_dispatch_intel(logs)
        
        # 🚀 SECTOR_DISPATCH: Sending localized briefings to Discord
        print("🚀 EXECUTING_GRAND_DISPATCH...")
        
        # New Stock mapping
        new_stock_id = channel_map.get("NEW_STOCK_ALERTS") if channel_map else "1487620217826836566"
        market_intel_id = channel_map.get("MARKET_INTEL") if channel_map else "1487620222297837681"
        resell_recon_id = channel_map.get("RESELLERS_RECON") if channel_map else "1487620231282294866"

        broadcast_to_channel(new_stock_id, briefings.get("NEW_STOCK_ALERTS"), "MARKET_OPPS: PRICE_TRACKER", 0xFF0000)
        broadcast_to_channel(market_intel_id, briefings.get("MARKET_INTEL"), "MARKET_INTEL: DROP_ANALYSIS", 0x3B82F6)
        broadcast_to_channel(resell_recon_id, briefings.get("RESELLERS_RECON"), "RESELLERS_RECON: SURVEILLANCE", 0x10B981)
        
        print("🎯 MISSION_COMPLETE | ALL_SECTORS_POPULATED")
        return True
    except Exception as e:
        print(f"❌ OVERWATCH_DISPATCH_FAILURE: {e}")
        return False

def broadcast_to_channel(channel_id, text, title, color):
    """Sends a tactical message to a specific Discord channel ID."""
    if not DISCORD_TOKEN: 
        print("⚠️ DISCORD_TOKEN_MISSING_IN_OVERWATCH")
        return
    
    # Check if we were passed a key instead of an ID
    actual_id = CHANNELS.get(channel_id) if channel_id in CHANNELS else channel_id

    url = f"https://discord.com/api/v10/channels/{actual_id}/messages"
    headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
    
    embed = {
        "title": f"🛰️ {title}",
        "description": text,
        "color": color,
        "footer": {"text": f"SOLE_SEEK_AI_HUB | Sector Dispatch Active"},
        "timestamp": datetime.now().isoformat()
    }
    
    res = requests.post(url, headers=headers, json={"embeds": [embed]})
    print(f"📡 DISCORD_DISPATCH_RESULT | Status: {res.status_code} | Channel: {actual_id} | Response: {res.text}")

if __name__ == "__main__":
    overwatch_mission_dispatch()
