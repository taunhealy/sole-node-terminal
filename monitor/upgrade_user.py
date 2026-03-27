import firebase_admin
from firebase_admin import credentials, firestore
import os

def upgrade_user():
    # Use existing credentials path from monitor logic
    cred_path = r"k:\Kea\sole-node\monitor\service-account-key.json"
    if not os.path.exists(cred_path):
        print("❌ Error: Service account key not found.")
        return

    cred = credentials.Certificate(cred_path)
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)

    db = firestore.client()
    user_ref = db.collection("users").document("taunhealy@gmail.com")
    
    user_ref.set({
        "tier": "Pro",
        "subscription_status": "active",
        "updated_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    print("✅ Success: taunhealy@gmail.com UPGRADED TO PRO.")

if __name__ == "__main__":
    upgrade_user()
