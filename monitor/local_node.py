import os
import time
import logging
import sys
from curl_cffi import requests
from google.cloud import firestore
import undetected_chromedriver as uc

# Force Local Service Account Credentials 
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "service-account-key.json")

# Configure logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', datefmt='%H:%M:%S', stream=sys.stdout)
logger = logging.getLogger("LOCAL_NODE")

db = firestore.Client()

def run_monitor_check():
    """Shelflife Monitor (Custom API View)"""
    target_url = "https://www.shelflife.co.za/products.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://www.shelflife.co.za/products"
    }
    try:
        response = requests.get(target_url, headers=headers, timeout=20, impersonate="chrome110")
        if response.status_code != 200: return
        results = response.json().get('results', {}).get('results', [])
        for product_entry in results:
            p = product_entry.get('result', {})
            title = p.get('title', 'Unknown')
            color = p.get('color') or '—'
            if color == '—':
                tl = title.lower()
                if "black" in tl or "blk" in tl: color = "Black"
                elif "white" in tl or "wht" in tl: color = "White"
            
            labels = p.get('labels', [])
            is_excl = any("Exclusive" in str(l) for l in labels)
            
            for sku in (p.get('skus') or []):
                sku_id = str(sku.get('id', ''))
                if not sku_id: continue
                size = sku.get('size_title') or (sku.get('size') or {}).get('title') or 'N/A'
                try: val = float(str(sku.get('price') or p.get('price')).replace('R','').replace(',','').strip())
                except: val = 0
                
                ref = db.collection("stock").document(sku_id)
                ref.set({
                    "sku_id": sku_id, "product_title": title, "size_title": size, "color": color,
                    "soh": int(sku.get('soh', 0)), "current_price": val, "store": "Shelflife",
                    "is_exclusive": is_excl,
                    "url": p.get('url', ''), "last_updated": firestore.SERVER_TIMESTAMP
                }, merge=True)
    except Exception as e: logger.error(f"Shelflife Sync Error: {e}")

def scrape_lemkus():
    """Jack Lemkus (Shopify)"""
    url = "https://www.lemkus.com/products.json?limit=250"
    try:
        r = requests.get(url, impersonate="chrome110")
        if r.status_code != 200: return
        for p in r.json().get('products', []):
            title = p.get('title', 'Unknown')
            opts = p.get('options', [])
            c_idx, s_idx = -1, -1
            for i, o in enumerate(opts):
                on = o.get('name','').lower()
                if 'color' in on: c_idx = i
                if 'size' in on: s_idx = i
            
            for v in p.get('variants', []):
                color, size = "—", v.get('title', 'N/A')
                vopts = [v.get('option1'), v.get('option2'), v.get('option3')]
                if c_idx != -1 and vopts[c_idx]: color = vopts[c_idx]
                if s_idx != -1 and vopts[s_idx]: size = vopts[s_idx]
                
                ref = db.collection("stock").document(str(v.get('id')))
                ref.set({
                    "sku_id": str(v.get('id')), "product_title": title, "size_title": size, "color": color,
                    "soh": 1 if v.get('available') else 0, "current_price": float(v.get('price', 0)),
                    "store": "Jack Lemkus", "url": f"https://www.lemkus.com/products/{p.get('handle')}",
                    "last_updated": firestore.SERVER_TIMESTAMP
                }, merge=True)
    except Exception as e: logger.error(f"Lemkus Sync Error: {e}")

def scrape_archive():
    """Archive (VTEX)"""
    search_url = "https://web-api.bash.com/v1/search/bloomreach?page=1&pageSize=40&orderBy=OrderByReleaseDateDESC&text=sneakers&persistentFilters=store%3AArchive"
    try:
        r = requests.get(search_url, impersonate="chrome110")
        if r.status_code != 200: return
        items = r.json().get('data', {}).get('items', [])
        ids = [str(i.get('vtex_id') or i.get('id')) for i in items if i]
        meta = {str(i.get('vtex_id') or i.get('id')): i for i in items if i}
        
        for i in range(0, len(ids), 10):
            batch = ids[i:i+10]
            fq = "&".join([f"fq=productId:{bid}" for bid in batch])
            vr = requests.get(f"https://bash.com/api/catalog_system/pub/products/search?{fq}", impersonate="chrome110")
            if vr.status_code == 200:
                for vp in vr.json():
                    m = meta.get(str(vp.get('productId')), {})
                    for itm in vp.get('items', []):
                        offer = itm.get('sellers', [{}])[0].get('commertialOffer', {})
                        soh_val = int(offer.get('AvailableQuantity', 0))
                        if soh_val > 99: soh_val = 99
                        
                        is_excl = "Exclusive" in (m.get('name') or "")
                        
                        ref = db.collection("stock").document(str(itm.get('itemId')))
                        ref.set({
                            "sku_id": str(itm.get('itemId')), "product_title": m.get('name'), "size_title": str(itm.get('Size', ['Multi'])[0]),
                            "color": m.get('baseColor', '—'), "soh": soh_val, "is_exclusive": is_excl,
                            "current_price": float(offer.get('Price', 0)), "store": "Archive",
                            "url": f"https://bash.com{m.get('url')}", "last_updated": firestore.SERVER_TIMESTAMP
                        }, merge=True)
    except Exception as e: logger.error(f"Archive Sync Error: {e}")

def scrape_amazon():
    """Amazon.co.za (Timberland & Puma)"""
    logger.info("🔍 Stealth Sweep: Amazon.co.za (Timberland / Puma)...")
    try:
        options = uc.ChromeOptions()
        options.add_argument('--headless=new')
        options.add_argument('--disable-blink-features=AutomationControlled')
        driver = uc.Chrome(options=options)
        
        keywords = ["timberland", "puma sneakers"]
        for kw in keywords:
            url = f"https://www.amazon.co.za/s?k={kw.replace(' ', '+')}"
            driver.get(url)
            time.sleep(6)
            
            items = driver.execute_script("""
                const res = [];
                document.querySelectorAll('.s-result-item[data-asin]').forEach(el => {
                    const t = el.querySelector('h2 a span')?.innerText;
                    const p = el.querySelector('.a-price .a-offscreen')?.innerText || el.querySelector('.a-price-whole')?.innerText;
                    const u = el.querySelector('h2 a')?.href;
                    const id = el.getAttribute('data-asin');
                    if(t && p && id && id.length > 5) res.push({ t, p, u, id });
                });
                return res;
            """) or []
            
            for itm in items:
                try: price = float(str(itm['p']).replace('R','').replace(',','').replace(' ','').strip())
                except: price = 0
                sid = f"AMZN_{itm['id']}"
                db.collection("stock").document(sid).set({
                    "sku_id": sid, "product_title": itm['t'], "size_title": "Multi", "color": "—",
                    "soh": 1, "current_price": price, "store": "Amazon", "url": itm['u'],
                    "last_updated": firestore.SERVER_TIMESTAMP
                }, merge=True)
        driver.quit()
    except Exception as e: logger.error(f"Amazon Sync Error: {e}")

def start_daemon():
    logger.info("🚀 SoleNode Local Monitor v1.6 Deep Scrape Start...")
    while True:
        try:
            run_monitor_check()
            scrape_lemkus()
            scrape_archive()
            scrape_amazon()
        except Exception as e: logger.error(f"Daemon Error: {e}")
        time.sleep(120)

if __name__ == "__main__":
    start_daemon()
