import os
import time
import logging
import sys
from curl_cffi import requests
from google.cloud import firestore

# Force Local Service Account Credentials 
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "service-account-key.json")

# Configure logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', datefmt='%H:%M:%S', stream=sys.stdout)
logger = logging.getLogger("LOCAL_NODE")

db = firestore.Client()

def run_monitor_check():
    target_url = "https://www.shelflife.co.za/products.json"
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
    except Exception as e:
        logger.error(f"❌ Fetch/Parse Error ({type(e).__name__}): {e}")
        return

    # Parse Products
    res_obj = data.get('results', {})
    results = res_obj.get('results', [])
    logger.info(f"📡 Processing {len(results)} items from Shelflife...")

    count = 0
    for product_entry in results:
        p = product_entry.get('result', {})
        if count == 0:
            logger.info(f"Available Product Fields: {list(p.keys())}")
        
        product_title = p.get('title', 'Unknown Product')
        slug = p.get('slug', '')
        
        raw_price = p.get('price', '0')
        try:
           current_price = float(raw_price.replace('R', '').replace(',', '').strip())
        except:
           current_price = 0
        
        skus = p.get('skus', [])
        
        for sku in skus:
            sku_id = str(sku.get('id'))
            size_title = sku.get('size_title', 'N/A')
            current_soh = int(sku.get('soh', 0))
            
            stock_ref = db.collection("stock").document(sku_id)
            doc = stock_ref.get()
            
            if doc.exists:
                old_state = doc.to_dict()
                old_soh = old_state.get('soh', 0)
                old_price = old_state.get('current_price', current_price)
                
                # RESTOCK DETECTED
                if current_soh > 0 and old_soh == 0:
                    logger.info(f"🔥 RESTOCK: {product_title} ({size_title})")
                    db.collection("restock_logs").add({
                        "type": "RESTOCK",
                        "sku_id": sku_id,
                        "product_title": product_title,
                        "size_title": size_title,
                        "quantity_added": current_soh,
                        "detected_at": firestore.SERVER_TIMESTAMP
                    })
                    
                    stock_ref.update({
                        "restocked_at": firestore.SERVER_TIMESTAMP
                    })

                # SALE DETECTED
                if current_price < old_price and current_price > 0:
                    logger.info(f"📉 SALE: {product_title} dropped to {raw_price}!")
                    db.collection("restock_logs").add({
                        "type": "SALE",
                        "sku_id": sku_id,
                        "product_title": product_title,
                        "size_title": size_title,
                        "price_at_event": raw_price,
                        "detected_at": firestore.SERVER_TIMESTAMP
                    })

                stock_ref.update({
                    "soh": current_soh,
                    "current_price": current_price,
                    "last_updated": firestore.SERVER_TIMESTAMP,
                    "store": "Shelflife"
                })
            else:
                stock_ref.set({
                    "sku_id": sku_id,
                    "product_title": product_title,
                    "size_title": size_title,
                    "soh": current_soh,
                    "current_price": current_price,
                    "original_price": current_price,
                    "last_updated": firestore.SERVER_TIMESTAMP,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "store": "Shelflife"
                })
            count += 1
            
    logger.info(f"✅ Synced {count} SKU sizes from Shelflife to Firestore.\n")

def scrape_lemkus():
    target_url = "https://www.lemkus.com/products.json?limit=250"
    logger.info(f"🔄 Requesting {target_url}...")
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(target_url, headers=headers, timeout=20, impersonate="chrome110")
        if response.status_code != 200:
            logger.error(f"❌ Monitor Blocked (Lemkus): {response.text[:200]}")
            return
        data = response.json()
    except Exception as e:
        logger.error(f"❌ Error fetching Lemkus: {e}")
        return

    products = data.get('products', [])
    logger.info(f"📡 Processing {len(products)} items from Jack Lemkus...")
    
    count = 0
    for p in products:
        product_title = p.get('title', 'Unknown Product')
        variants = p.get('variants', [])
        
        for v in variants:
            sku_id = str(v.get('id', ''))
            if not sku_id: continue
            
            size_title = str(v.get('title', 'N/A'))
            
            # Default to 1 if available, otherwise 0
            is_available = v.get('available', False)
            current_soh = 1 if is_available else 0
            
            # Price
            raw_price = v.get('price', '0')
            try:
                current_price = float(raw_price)
            except:
                current_price = 0
                
            raw_original = v.get('compare_at_price', None)
            try:
                original_price = float(raw_original) if raw_original else current_price
            except:
                original_price = current_price
                
            # DB logic
            stock_ref = db.collection("stock").document(sku_id)
            doc = stock_ref.get()
            
            if doc.exists:
                old_state = doc.to_dict()
                old_soh = old_state.get('soh', 0)
                old_price = old_state.get('current_price', current_price)
                
                # RESTOCK DETECTED
                if current_soh > 0 and old_soh == 0:
                    logger.info(f"🔥 RESTOCK (Lemkus): {product_title} ({size_title})")
                    db.collection("restock_logs").add({
                        "type": "RESTOCK",
                        "sku_id": sku_id,
                        "product_title": product_title,
                        "size_title": size_title,
                        "quantity_added": current_soh,
                        "detected_at": firestore.SERVER_TIMESTAMP
                    })
                    
                    stock_ref.update({
                        "restocked_at": firestore.SERVER_TIMESTAMP
                    })

                # SALE DETECTED
                if current_price < old_price and current_price > 0:
                    logger.info(f"📉 SALE (Lemkus): {product_title} dropped to {current_price}!")
                    db.collection("restock_logs").add({
                        "type": "SALE",
                        "sku_id": sku_id,
                        "product_title": product_title,
                        "size_title": size_title,
                        "price_at_event": current_price,
                        "detected_at": firestore.SERVER_TIMESTAMP
                    })

                stock_ref.update({
                    "soh": current_soh,
                    "current_price": current_price,
                    "last_updated": firestore.SERVER_TIMESTAMP,
                    "store": "Jack Lemkus"
                })
            else:
                stock_ref.set({
                    "sku_id": sku_id,
                    "product_title": product_title,
                    "size_title": size_title,
                    "soh": current_soh,
                    "current_price": current_price,
                    "original_price": original_price,
                    "last_updated": firestore.SERVER_TIMESTAMP,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "store": "Jack Lemkus"
                })
            count += 1
            
    logger.info(f"✅ Synced {count} SKU sizes from Jack Lemkus to Firestore.\n")

def scrape_archive():
    # Bloomreach search API for Archive (Bash.com)
    target_url = "https://web-api.bash.com/v1/search/bloomreach?page=1&pageSize=100&orderBy=OrderByReleaseDateDESC&text=sneakers&persistentFilters=store%3AArchive"
    logger.info(f"🔄 Requesting {target_url}...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(target_url, headers=headers, timeout=20, impersonate="chrome110")
        if response.status_code != 200:
            logger.error(f"❌ Monitor Blocked (Archive): {response.status_code}")
            return
        data = response.json()
    except Exception as e:
        logger.error(f"❌ Error fetching Archive: {e}")
        return

    items = data.get('data', {}).get('items', [])
    logger.info(f"📡 Processing {len(items)} items from Archive.co.za...")
    
    count = 0
    for item in items:
        product_title = item.get('name', 'Unknown Product')
        sku_id = item.get('vtex_id') or item.get('id')
        if not sku_id: continue
        
        # Bash API often represents price in cents
        raw_price_cents = item.get('sellingPrice', 0)
        current_price = raw_price_cents / 100.0
        
        # We don't have variants in this specific search API view, so we treat it as a single SKU. 
        # For a full implementation, we'd fetch the product detail page, but for now we track the main product availability.
        current_soh = 1 # Search results usually imply stock unless explicitly marked
        
        stock_ref = db.collection("stock").document(str(sku_id))
        doc = stock_ref.get()
        
        if doc.exists:
            old_state = doc.to_dict()
            old_price = old_state.get('current_price', current_price)
            
            if current_price < old_price and current_price > 0:
                logger.info(f"📉 SALE (Archive): {product_title} dropped to R{current_price}!")
                db.collection("restock_logs").add({
                    "type": "SALE",
                    "sku_id": str(sku_id),
                    "product_title": product_title,
                    "price_at_event": f"R{current_price}",
                    "detected_at": firestore.SERVER_TIMESTAMP
                })

            stock_ref.update({
                "soh": current_soh,
                "current_price": current_price,
                "last_updated": firestore.SERVER_TIMESTAMP,
                "store": "Archive"
            })
        else:
            stock_ref.set({
                "sku_id": str(sku_id),
                "product_title": product_title,
                "size_title": "Multi-Size",
                "soh": current_soh,
                "current_price": current_price,
                "original_price": current_price,
                "last_updated": firestore.SERVER_TIMESTAMP,
                "created_at": firestore.SERVER_TIMESTAMP,
                "store": "Archive"
            })
        count += 1
            
    logger.info(f"✅ Synced {count} items from Archive to Firestore.\n")

def start_daemon():
    logger.info("🚀 Starting SoleNode.io Local Node Daemon...")
    logger.info("🛡️ Using residential IP to bypass Cloudflare. Database sync is active.")
    
    while True:
        logger.info("⏳ Initiating Monitor Cycle...")
        try:
            run_monitor_check()  # Shelflife
            scrape_lemkus()      # Jack Lemkus
            scrape_archive()     # Archive
        except Exception as e:
            logger.error(f"Critical Node Error: {e}")
        
        logger.info("💤 Cycle complete. Sweeping again in 60 seconds...\n")
        time.sleep(60)

if __name__ == "__main__":
    start_daemon()
