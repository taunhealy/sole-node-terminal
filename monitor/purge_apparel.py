import os
import firebase_admin
from firebase_admin import credentials, firestore

# 🔑 TACTICAL_CREDENTIALS: Use the local key path from your .env location
KEY_PATH = "k:\\Kea\\sole-node\\monitor\\service-account-key.json"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = KEY_PATH

# 🛡️ FILTRATION_PROTOCOLS: Keywords to identify apparel poisoning
APPAREL_KEYWORDS = [
    "T-Shirt", "Tee", "Hoodie", "Shorts", "Pants", "Socks", 
    "Jacket", "Cap", "Hat", "Beanie", "Bag", "Bottle", "Accessory"
]

def purge_apparel_poisoning():
    """Identifies and deletes non-sneaker assets from the Firestore hive."""
    db = firestore.Client(project="sneaker-stock-alert")
    
    deleted_count = 0
    collections = ["drops", "sneakers"]
    
    print("🧹 INITIATING_APPAREL_PURGE...")
    
    for coll_name in collections:
        docs = db.collection(coll_name).stream()
        for doc in docs:
            title = doc.to_dict().get("product_title", "")
            if any(keyword.lower() in title.lower() for keyword in APPAREL_KEYWORDS):
                print(f"🗑️ DELETING_APPAREL: {title} (ID: {doc.id})")
                db.collection(coll_name).document(doc.id).delete()
                deleted_count += 1
                
    print(f"✅ PURGE_COMPLETE | Total Assets Deactivated: {deleted_count}")

if __name__ == "__main__":
    purge_apparel_poisoning()
