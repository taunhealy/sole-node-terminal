import os
import time
import requests
from datetime import datetime
from google.cloud import firestore
from dotenv import load_dotenv

# Path to .env in root
load_dotenv(dotenv_path="../.env")

# Path to keys
CRED_PATH = os.path.join(os.getcwd(), "service-account-key.json")
if os.path.exists(CRED_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CRED_PATH

db = firestore.Client()
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
RESTOCK_CHANNEL_ID = "1487593595295891476"

def broadcast_test(title, size, price, store):
    """Sends a rich mock alert to your live-restocks channel."""
    if not DISCORD_TOKEN:
        print("⚠️ No DISCORD_TOKEN found in your root .env file.")
        return
    
    url = f"https://discord.com/api/v10/channels/{RESTOCK_CHANNEL_ID}/messages"
    headers = {"Authorization": f"Bot {DISCORD_TOKEN}", "Content-Type": "application/json"}
    
    embed = {
        "title": f"🚨 MOCK_RESTOCK: {title}",
        "color": 0xFF0000,
        "fields": [
            {"name": "📏 SIZE", "value": f"`{size}`", "inline": True},
            {"name": "💰 PRICE", "value": f"`R {price}`", "inline": True},
            {"name": "📊 HYPE_SCORE", "value": "`9.4/10 (LIQUIDITY_MAX)`", "inline": True},
            {"name": "🏪 STORE", "value": f"`{store}`", "inline": True},
        ],
        "footer": {"text": "SOLE_SEEK_INTELLIGENCE | Tactical Restock Simulation active"},
        "timestamp": datetime.now().isoformat()
    }
    
    resp = requests.post(url, headers=headers, json={"embeds": [embed]})
    if resp.status_code == 200:
        print(f"✅ DISCORD_BROADCAST_SUCCESS: Check your channel!")
    else:
        print(f"❌ DISCORD_BROADCAST_FAILED: {resp.text}")

def simulate_restock():
    print("💎 Simulating a Mock Restock Event...")
    sku_id = "MOCK-TEST-002"
    product_title = "Nike Dunk Low 'Retro Black White'"
    size = "UK 10"
    price = 2399.00
    store = "Shelflife"
    
    # 1. Update Firestore
    db.collection("stock").document(sku_id).set({
        "sku_id": sku_id,
        "product_title": product_title,
        "size_title": size,
        "soh": 10,
        "current_price": price,
        "last_updated": firestore.SERVER_TIMESTAMP,
        "restocked_at": firestore.SERVER_TIMESTAMP,
        "store": store
    }, merge=True)
    
    print(f"✅ Product {sku_id} updated in 'stock' collection.")

    # 2. Broadcast to Discord
    broadcast_test(product_title, size, price, store)

if __name__ == "__main__":
    simulate_restock()
