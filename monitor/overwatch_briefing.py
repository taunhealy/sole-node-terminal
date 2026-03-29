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
    """Fetches restock logs from the last 24 hours."""
    yesterday = datetime.now() - timedelta(hours=24)
    logs_ref = db.collection("restock_logs").where("detected_at", ">=", yesterday).limit(100)
    return [doc.to_dict() for doc in logs_ref.stream()]

def generate_multi_dispatch_intel(logs):
    """Generates 4 unique intelligence reports based on market data."""
    log_summary = "\n".join([f"- {l.get('product_title')} at {l.get('store')} (Size {l.get('size_title')})" for l in logs[:20]])

    missions = {
        "NEW_STOCK_ALERTS": (
            "Analyze these restocks for price drops and profit margins. "
            "Identify 2-3 items with high resale potential. "
            "Format as: '🚨 PRICE_DROP_DETECTED: [Item] @ [Store] | Margin: RXXXX'."
        ),
        "MARKET_INTEL": (
            "Analyze these movements to predict upcoming drops or restocks. "
            "Focus on 'Sector Confirmed' leaks. "
            "Format as: '📡 MARKET_INTEL_CONFIRMED: [Item] | Strategy: [Wait/Buy]'."
        ),
        "EARLY_ACCESS_INTEL": (
            "Identify high-value variants and hidden product links from the data. "
            "Format as: '🛰️ EARLY_ACCESS_INTELLIGENCE: [Item] | Status: INCOMING'."
        ),
        "RESELLERS_RECON": (
            "Analyze store behavior to identify localized supply scouting opportunities. "
            "Format as: '🏹 RESELLERS_RECON: [Location/Store] | Tip: [Inventory Low/High]'. "
            "Use South African stores (Shelflife, Archive, Lemkus) for location context."
        )
    }

    briefings = {}
    for mission, instructions in missions.items():
        prompt = f"""
        You are 'SoleSeek Overwatch' AI Dispatch. 
        DATA SECTOR: {log_summary}
        MISSION: {instructions}
        
        REQUIREMENTS:
        - 1-2 lines per alert Max.
        - Strategic, professional tone. 
        - Use tactical notation (🛰️, 🛡️, 🚨).
        - NO fluff.
        """
        response = model.generate_content(prompt)
        briefings[mission] = response.text
    
    return briefings

def broadcast_to_channel(channel_key, text, title, color):
    """Sends a tactical message to a specific Discord channel."""
    if not DISCORD_TOKEN: return
    
    channel_id = CHANNELS.get(channel_key)
    if not channel_id: return

    url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
    headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
    
    embed = {
        "title": f"🛰️ {title}",
        "description": text,
        "color": color,
        "footer": {"text": f"SOLE_SEEK_AI_HUB | Sector: South Africa | {datetime.now().strftime('%Y-%m-%d %H:%M')}"}
    }
    
    requests.post(url, headers=headers, json={"embeds": [embed]})

if __name__ == "__main__":
    print("📡 INITIATING_MULTI_SECTOR_INTELLIGENCE_DISPATCH...")
    logs = fetch_restock_data()
    print("🧠 ENGAGING_AI_MISSION_PLANNING...")
    briefings = generate_multi_dispatch_intel(logs)
    
    print("🚀 EXECUTING_GRAND_DISPATCH...")
    broadcast_to_channel("NEW_STOCK_ALERTS", briefings["NEW_STOCK_ALERTS"], "NEW_STOCK_ALERTS: MARGIN_OPPS", 0xFF0000)
    broadcast_to_channel("MARKET_INTEL", briefings["MARKET_INTEL"], "MARKET_INTEL: DROP_CONFIRMATIONS", 0x3B82F6)
    broadcast_to_channel("EARLY_ACCESS_INTEL", briefings["EARLY_ACCESS_INTEL"], "EARLY_ACCESS_INTELLIGENCE", 0x8B5CF6)
    broadcast_to_channel("RESELLERS_RECON", briefings["RESELLERS_RECON"], "RESELLERS_RECON: LOCALIZED_SURVEILLANCE", 0x10B981)
    
    print("🎯 MISSION_COMPLETE | ALL_SECTORS_POPULATED")
