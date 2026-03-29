import os
from google.cloud import firestore
from dotenv import load_dotenv

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = 'k:/Kea/sole-node/monitor/service-account-key.json'
db = firestore.Client()

def seed_users():
    users = [
        {
            "email": "kea@logic.com",
            "full_name": "Kea Logic",
            "tier": "Standard", # Standard: Up to 3 Alerts, Pro: Up to 1000 Alerts
            "subscription_status": "active",
            "created_at": firestore.SERVER_TIMESTAMP
        },
        {
            "email": "taunhealy@gmail.com",
            "full_name": "Taun Healy",
            "tier": "Pro",
            "subscription_status": "active",
            "created_at": firestore.SERVER_TIMESTAMP
        }


    ]
    
    for user in users:
        print(f"Seeding user: {user['email']}")
        db.collection("users").document(user['email']).set(user)
    
    print("User seeding complete.")

if __name__ == "__main__":
    seed_users()
