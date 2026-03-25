import os
from google.cloud import firestore

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"k:\Kea\sneak-attack\monitor\service-account-key.json"
db = firestore.Client()

def full_purge():
    # Purge ALL inventory to allow for a 100% clean, sneaker-only re-sync
    collections_to_clear = ["stock", "restock_logs"]
    
    for coll_name in collections_to_clear:
        print(f"🧹 Purging entire '{coll_name}' collection...")
        coll_ref = db.collection(coll_name)
        docs = coll_ref.stream()
        
        batch = db.batch()
        count = 0
        total = 0
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            total += 1
            if count >= 400:
                batch.commit()
                batch = db.batch()
                count = 0
        if count > 0:
            batch.commit()
        print(f"✅ Deleted {total} documents from '{coll_name}'.")

    print("\n🚀 Database is now EMPTY. Please REBUILD and RESTART your monitor to begin the fresh, sneaker-only sync.")

if __name__ == "__main__":
    full_purge()
