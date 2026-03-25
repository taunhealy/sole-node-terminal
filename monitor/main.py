from fastapi import FastAPI, BackgroundTasks
from curl_cffi import requests
from google.cloud import firestore
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = FastAPI()

# --- GOOGLE CLOUD CONFIG ---
db = firestore.Client()

# --- ALERT SERVICES ---
def send_email_alert(recipient_email: str, product_title: str, size: str, link: str, alert_type="RESTOCK", price=None):
    """
    Simulated Email Service.
    In Production: Integrate SendGrid or Postmark.
    """
    subject = f"🚨 {alert_type}: {product_title}!"
    if alert_type == "SALE" and price:
        body = f"HUGE PRICE DROP! {product_title} is now only {price}! Cop it here: {link}"
    else:
        body = f"BACK IN STOCK! {product_title} in Size {size} is back. Cop it here: {link}"
        
    print(f"📧 EMAIL SENT TO {recipient_email}")
    print(f"Subject: {subject}")
    print(f"Body: {body}\n")

import logging
import sys

# Configure logging to show up in Cloud Run Logs Explorer
logging.basicConfig(level=logging.INFO, stream=sys.stdout)
logger = logging.getLogger("uvicorn.error")

def run_monitor_check():
    target_url = "https://www.shelflife.co.za/products.json"
    
    # 🔗 Anti-Bot Headers (Masquerading as a South African Shopper)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.shelflife.co.za/products",
        "Accept-Language": "en-ZA,en;q=0.9"
    }

    logger.info(f"🔄 Requesting {target_url}...")
    try:
        response = requests.get(target_url, headers=headers, timeout=20, impersonate="chrome110")
        logger.info(f"📥 Received Status: {response.status_code}")
        
        if response.status_code != 200:
            logger.error(f"❌ Monitor Blocked: {response.text[:200]}")
            return
            
        data = response.json()
        logger.info(f"✅ JSON Parsed successfully (Keys: {list(data.keys())})")
    except Exception as e:
        logger.error(f"❌ Fetch/Parse Error ({type(e).__name__}): {e}")
        try:
            logger.error(f"Response Body Snippet: {response.text[:500]}")
        except:
            pass
        return

    # 🏹 Parse Products
    res_obj = data.get('results', {})
    results = res_obj.get('results', [])
    logger.info(f"📡 Processing {len(results)} items from Shelflife...")

    for product_entry in results:
        p = product_entry.get('result', {})
        product_title = p.get('title', 'Unknown Product')
        slug = p.get('slug', '')
        # Price is usually "R 3,499.00" - we strip formatting for comparison
        raw_price = p.get('price', '0')
        try:
           # Clean "R 3,499.00" to float 3499.00
           current_price = float(raw_price.replace('R', '').replace(',', '').strip())
        except:
           current_price = 0
        
        skus = p.get('skus', [])
        
        for sku in skus:
            sku_id = str(sku.get('id'))
            size_title = sku.get('size_title', 'N/A')
            current_soh = int(sku.get('soh', 0))
            
            # 1. State Comparison (Firestore Fetch)
            stock_ref = db.collection("stock").document(sku_id)
            doc = stock_ref.get()
            
            if doc.exists:
                old_state = doc.to_dict()
                old_soh = old_state.get('soh', 0)
                old_price = old_state.get('current_price', current_price)
                
                # --- EVENT A: RESTOCK DETECTED ---
                if current_soh > 0 and old_soh == 0:
                    print(f"🔥 RESTOCK: {product_title} ({size_title})")
                    trigger_alerts(sku_id, product_title, size_title, slug, "RESTOCK")
                    log_event("RESTOCK", sku_id, product_title, size_title, current_soh)

                # --- EVENT B: SALE DETECTED ---
                if current_price < old_price and current_price > 0:
                    print(f"📉 SALE: {product_title} dropped to {raw_price}!")
                    trigger_alerts(sku_id, product_title, size_title, slug, "SALE", raw_price)
                    log_event("SALE", sku_id, product_title, size_title, current_soh, raw_price)

                # Update current state
                stock_ref.update({
                    "soh": current_soh,
                    "current_price": current_price,
                    "last_updated": firestore.SERVER_TIMESTAMP
                })
            else:
                # First time seeing this product
                stock_ref.set({
                    "sku_id": sku_id,
                    "product_title": product_title,
                    "size_title": size_title,
                    "soh": current_soh,
                    "current_price": current_price,
                    "original_price": current_price,
                    "last_updated": firestore.SERVER_TIMESTAMP
                })

def trigger_alerts(sku_id, product_title, size_title, slug, alert_type, price=None):
    """ Matches SKU to users in the database """
    alerts_query = db.collection("user_alerts") \
        .where("sku_id", "==", sku_id) \
        .where("status", "==", "active") \
        .stream()

    product_link = f"https://www.shelflife.co.za/product/{slug}"
    
    for alert in alerts_query:
        alert_data = alert.to_dict()
        recipient = alert_data.get('user_email')
        
        # Check user tier (Standard vs Pro)
        user_doc = db.collection("users").document(recipient).get()
        user_data = user_doc.to_dict() if user_doc.exists else {"tier": "Standard"}
        tier = user_data.get("tier", "Standard")
        
        logger.info(f"🔔 ALERT TRIGGERED [{tier}]: {recipient} for {product_title}")
        
        if recipient:
            send_email_alert(recipient, product_title, size_title, product_link, alert_type, price)
            
        # Status remains active if it's just a price change, triggered if it was a restock
        if alert_type == "RESTOCK":
            alert.reference.update({"status": "triggered"})

def log_event(type, sku_id, title, size, soh, price=None):
    """ Record activity for the global feed """
    db.collection("restock_logs").add({
        "type": type,
        "sku_id": sku_id,
        "product_title": title,
        "size_title": size,
        "quantity_added": soh,
        "price_at_event": price,
        "detected_at": firestore.SERVER_TIMESTAMP
    })

@app.get("/")
def home():
    return {"message": "Sneak Attack Monitor v2 (GCP Firestore) is active"}
@app.get("/check")
@app.get("/seed")
def trigger_check():
    """ Runs synchronously to show logs in real-time during manual testing (Curl) """
    logger.info("🚦 MANUAL TRIGGER: Starting Scraper sync...")
    run_monitor_check()
    logger.info("🏁 MANUAL TRIGGER: Scraper sync finished.")
    return {"status": "Monitor check completed."}

@app.get("/mock-seed")
def mock_seed():
    """ Seeds Firestore with 3 mock sneakers to test the Terminal UI """
    mocks = [
        {"sku_id": "DD1391-100", "product_title": "Nike Dunk Low Retro 'Panda'", "size_title": "UK 10", "current_price": 2499.00, "original_price": 2499.00, "soh": 5},
        {"sku_id": "FV5029-006", "product_title": "Air Jordan 4 Retro 'Bred Reimagined'", "size_title": "UK 9", "current_price": 3899.00, "original_price": 3899.00, "soh": 2},
        {"sku_id": "U9060ECA", "product_title": "New Balance 9060 'Sea Salt'", "size_title": "UK 11", "current_price": 3399.00, "original_price": 3399.00, "soh": 12}
    ]
    for m in mocks:
        db.collection("stock").document(m["sku_id"]).set({
            **m,
            "last_updated": firestore.SERVER_TIMESTAMP
        })
    return {"status": "Mock data seeded. Terminal should be live!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
