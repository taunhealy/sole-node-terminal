import os
import time
from google.cloud import firestore
from dotenv import load_dotenv

# Path to keys
CRED_PATH = os.path.join(os.getcwd(), "service-account-key.json")
if os.path.exists(CRED_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CRED_PATH

db = firestore.Client()

def simulate_restock():
    print("💎 Simulating a Mock Restock Event...")
    
    # 1. Update a product in the 'stock' collection
    # Using a recognizable ID for testing
    sku_id = "MOCK-TEST-001"
    product_title = "Nike Dunk Low 'Test Panda'"
    size = "UK 9"
    
    stock_ref = db.collection("stock").document(sku_id)
    stock_ref.set({
        "sku_id": sku_id,
        "product_title": product_title,
        "size_title": size,
        "soh": 5,
        "current_price": 2499.00,
        "last_updated": firestore.SERVER_TIMESTAMP,
        "restocked_at": firestore.SERVER_TIMESTAMP,
        "store": "Shelflife"
    }, merge=True)
    
    print(f"✅ Product {sku_id} updated in 'stock' collection.")

    # 2. Add a restock log to test the Live Feed
    log_ref = db.collection("restock_logs").add({
        "type": "RESTOCK",
        "sku_id": sku_id,
        "product_title": product_title,
        "size_title": size,
        "quantity_added": 5,
        "detected_at": firestore.SERVER_TIMESTAMP,
        "store": "Shelflife"
    })
    
    print(f"✅ Log entry created. Check your Dashboard Live Feed now!")

if __name__ == "__main__":
    simulate_restock()
