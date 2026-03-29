import requests
import json
import time
import os
from dotenv import load_dotenv
from firebase_admin import firestore, credentials, initialize_app

# Load env
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = os.getenv("DISCORD_SERVER_ID")
APP_ID = os.getenv("DISCORD_APPLICATION_ID")

# Firebase Init
CRED_PATH = os.path.join(os.getcwd(), "monitor", "service-account-key.json")
if os.path.exists(CRED_PATH):
    cred = credentials.Certificate(CRED_PATH)
    initialize_app(cred)
db = firestore.client()

BASE_URL = "https://discord.com/api/v10"
HEADERS = {"Authorization": f"Bot {TOKEN}", "Content-Type": "application/json"}

def nuke_duplicates():
    """Finds and deletes channels/categories with duplicate names."""
    print("📡 SCANNING_FOR_DUPLICATES...")
    resp = requests.get(f"{BASE_URL}/guilds/{GUILD_ID}/channels", headers=HEADERS)
    if resp.status_code != 200: return
    
    channels = resp.json()
    seen_names = {} # {name: [id1, id2]}
    
    for c in channels:
        name = c['name']
        ctype = c['type']
        key = f"{name}_{ctype}"
        if key not in seen_names: seen_names[key] = []
        seen_names[key].append(c['id'])
        
    for key, ids in seen_names.items():
        if len(ids) > 1:
            # Keep the LATEST one (usually higher ID but not always, we'll keep the first one found)
            to_keep = ids[0]
            to_nuke = ids[1:]
            print(f"🚨 DUPLICATES_FOUND: {key} | Nuking: {to_nuke}")
            for nid in to_nuke:
                requests.delete(f"{BASE_URL}/channels/{nid}", headers=HEADERS)
                print(f"💥 NUKED_CHANNEL: {nid}")

def lock_marketplace():
    """Ultimate lockdown for indie-resellers."""
    print("📡 HARDENING_MARKETPLACE_LOCKDOWN...")
    # Find the indie-resellers channel
    resp = requests.get(f"{BASE_URL}/guilds/{GUILD_ID}/channels", headers=HEADERS)
    market_id = None
    for c in resp.json():
        if c['name'] == 'indie-resellers' and c['type'] == 15:
            market_id = c['id']
            break
            
    if not market_id:
        print("❌ MARKETPLACE_NOT_FOUND")
        return
        
    everyone_id = GUILD_ID
    # Deny CREATE_FORUM_THREADS (1 << 37) and SEND_MESSAGES (1 << 11) = 137438953472
    # We also deny SEND_MESSAGES_IN_THREADS (1 << 38)
    deny_bit = str(137438953472 + (1 << 38))
    
    overwrites = [
        {"id": everyone_id, "type": 0, "allow": "0", "deny": deny_bit}
    ]
    
    requests.patch(f"{BASE_URL}/channels/{market_id}", headers=HEADERS, json={"permission_overwrites": overwrites})
    print(f"✅ MARKETPLACE_HARDENED: #{market_id}")
    return market_id

def seed_marketplace(market_id):
    """Creates 5 mock marketplace threads and seeds Firestore."""
    print("📡 SEEDING_MARKET_INTELLIGENCE...")
    
    mock_listings = [
        {"item": "Air Jordan 4 'Military Blue'", "size": "UK 10", "price": "5500", "cond": "DS"},
        {"item": "Nike SB Dunk Low 'Futura'", "size": "UK 9", "price": "7200", "cond": "DS"},
        {"item": "Adidas Yeezy Boost 350 V2", "size": "UK 11", "price": "3800", "cond": "Used (9/10)"},
        {"item": "New Balance 1906R 'Protection Pack'", "size": "UK 8", "price": "4200", "cond": "VNDS"},
        {"item": "Air Jordan 1 High 'Lost & Found'", "size": "UK 10", "price": "8500", "cond": "DS"}
    ]
    
    for lst in mock_listings:
        # Create Firestore Entry
        img_url = "https://firebasestorage.googleapis.com/v0/b/sneaker-stock-alert.firebasestorage.app/o/products%2Fplaceholder_shoe.png?alt=media"
        db.collection("resell_items").add({
            "title": lst['item'],
            "size": lst['size'],
            "price": lst['price'],
            "condition": lst['cond'],
            "seller_discord": "Overwatch_AI",
            "image_url": img_url,
            "source": "discord",
            "verified": True,
            "created_at": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
        })

        # Create Discord Thread
        content = (
            f"📦 **PRODUCT_LISTING: {lst['item'].upper()}**\n\n"
            f"👤 **Seller**: Overwatch_AI\n"
            f"📏 **Size**: `{lst['size']}`\n"
            f"💰 **Price**: `R{lst['price']}`\n"
            f"🛡️ **Condition**: `{lst['cond']}`\n\n"
            "*Authorized SoleSeek Marketplace Protocol Active.* 🛰️🏛️🏹"
        )
        
        payload = {
            "name": f"{lst['item']} | R{lst['price']}",
            "message": {"content": content}
        }
        resp = requests.post(f"{BASE_URL}/channels/{market_id}/threads", headers=HEADERS, json=payload)
        if resp.status_code in [200, 201]:
            print(f"✅ SEEDED_LISTING: {lst['item']}")
        else:
            print(f"❌ SEED_FAILED: {resp.text}")
        time.sleep(1)

if __name__ == "__main__":
    if not TOKEN:
        print("⚠️ No DISCORD_TOKEN found.")
    else:
        nuke_duplicates()
        market_id = lock_marketplace()
        if market_id:
            seed_marketplace(market_id)
        print("\n🎯 NUKE_AND_SEED_PROTOCOL_TERMINATED | HQ_CLEAN_AND_OPERATIONAL")
