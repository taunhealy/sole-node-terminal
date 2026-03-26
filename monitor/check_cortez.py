import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("k:/Kea/sole-node/monitor/service-account.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()

items = db.collection("stock").where("store", "==", "Court Order").get()
print(f"Total Court Order items: {len(items)}")

cortez = db.collection("stock").where("product_title", ">=", "Nike Classic Cortez").where("product_title", "<=", "Nike Classic Cortez" + "\uf8ff").get()
print(f"Cortez items: {len(cortez)}")
for c in cortez:
    print(f"Found: {c.to_dict().get('product_title')} - {c.to_dict().get('sku_id')}")
