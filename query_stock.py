import os
from google.cloud import firestore

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"k:\Kea\sneak-attack\monitor\service-account-key.json"
db = firestore.Client()

sku_id = "122051"
doc_ref = db.collection("stock").document(sku_id)
doc = doc_ref.get()

if doc.exists:
    print(f"SKU {sku_id} data:")
    print(doc.to_dict())
else:
    print(f"SKU {sku_id} not found in Firestore.")
