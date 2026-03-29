import os
from google.cloud import firestore

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = 'k:/Kea/sole-node/monitor/service-account-key.json'
db = firestore.Client()

def query_user(email):
    print(f"Querying for user: {email}")
    user_ref = db.collection("users").document(email)
    doc = user_ref.get()
    if doc.exists:
        print("User data found:")
        print(doc.to_dict())
    else:
        print("User document NOT found.")

    # Also check the whole collection for matching emails
    print("Searching the entire 'users' collection for matches...")
    users_coll = db.collection("users").stream()
    for user in users_coll:
        if user.id == email or user.to_dict().get("email") == email:
            print(f"Matched by doc ID or field: {user.id} -> {user.to_dict()}")

if __name__ == "__main__":
    query_user("taunhealy@gmail.com")
