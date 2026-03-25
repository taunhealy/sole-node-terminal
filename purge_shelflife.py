import os
from google.cloud import firestore

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"k:\Kea\sneak-attack\monitor\service-account-key.json"
db = firestore.Client()

def purge_shelflife():
    # 1. Clear stock collection for Shelflife
    print("🧹 Purging Shelflife inventory from 'stock'...")
    stock_ref = db.collection("stock").where("store", "==", "Shelflife")
    docs = stock_ref.stream()
    
    batch = db.batch()
    count = 0
    for doc in docs:
        batch.delete(doc.reference)
        count += 1
        if count >= 400:
            batch.commit()
            batch = db.batch()
            count = 0
    if count > 0:
        batch.commit()
    print(f"✅ Deleted {count} total documents (Shelflife).")

    # 2. Clear relevant restock logs to reset the feed
    print("🧹 Purging Shelflife logs from 'restock_logs'...")
    logs_ref = db.collection("restock_logs").where("store", "==", "Shelflife")
    docs = logs_ref.stream()
    
    batch = db.batch()
    count = 0
    for doc in docs:
        batch.delete(doc.reference)
        count += 1
        if count >= 400:
            batch.commit()
            batch = db.batch()
            count = 0
    if count > 0:
        batch.commit()
    print("✅ Shelflife purges complete. You can now start the monitor for a fresh sync.")

if __name__ == "__main__":
    purge_shelflife()
