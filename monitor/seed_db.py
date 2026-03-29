from google.cloud import firestore
import os

# Set credentials if necessary
KEY_PATH = "service-account-key.json"
if os.path.exists(KEY_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.abspath(KEY_PATH)

db = firestore.Client()

def seed_sneaker_of_the_day():
    doc_ref = db.collection("sneaker_of_the_day").document("sunday_jordan_4")
    doc_ref.set({
        "name": "Air Jordan 4 'Military Blue'",
        "price": "R3,999",
        "resale_prediction": "R5,150+",
        "image_url": "/sneaker_of_the_day.png",
        "detected_at": firestore.SERVER_TIMESTAMP
    })
    print("✅ Seeded Sunday Sneaker of the Day!")

if __name__ == "__main__":
    seed_sneaker_of_the_day()
