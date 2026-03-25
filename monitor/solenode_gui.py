import os
import sys
import threading
import time
import customtkinter as ctk
from curl_cffi import requests
from google.cloud import firestore
import undetected_chromedriver as uc

# Setup Theme
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

def get_resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

# Set credentials env
CRED_PATH = get_resource_path("service-account-key.json")
if os.path.exists(CRED_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CRED_PATH

class SoleNodeApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("SoleNode.io | v1.5 Deep Scraper")
        self.geometry("1000x800")
        self.protocol("WM_DELETE_WINDOW", self.on_closing)

        # State
        self.monitoring = False
        self.monitor_thread = None
        self.db = None
        self.session_cookies = {}
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        
        try:
            self.db = firestore.Client()
        except: pass

        # UI Layout
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        self.header_label = ctk.CTkLabel(self, text="SOLENODE.io", font=("Inter", 36, "bold"), text_color="#3a86ff")
        self.header_label.grid(row=0, column=0, pady=(30, 5), sticky="n")

        self.status_label = ctk.CTkLabel(self, text="SERVER STATUS: STOPPED", font=("Inter", 14, "bold"), text_color="gray")
        self.status_label.grid(row=1, column=0, pady=(0, 20), sticky="n")

        self.control_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.control_frame.grid(row=4, column=0, pady=30)

        self.start_btn = ctk.CTkButton(self.control_frame, text="START MONITOR", command=self.start_monitor, width=200, height=55, font=("Inter", 15, "bold"), fg_color="#28a745", hover_color="#218838")
        self.start_btn.grid(row=0, column=0, padx=15)

        self.stop_btn = ctk.CTkButton(self.control_frame, text="STOP MONITOR", command=self.stop_monitor, state="disabled", width=200, height=55, font=("Inter", 14, "bold"), fg_color="#dc3545", hover_color="#c82333")
        self.stop_btn.grid(row=0, column=1, padx=15)

        self.log_box = ctk.CTkTextbox(self, font=("Consolas", 12), border_width=1, border_color="#2d2d33")
        self.log_box.grid(row=2, column=0, padx=40, pady=10, sticky="nsew")
        self.log_box.insert("0.0", ">>> SoleNode Terminal v1.5 [Full Inventory Sync] Initialized.\n>>> 🟢 Database: Connected\n>>> 🛡️ Stealth: Ready\n")

    def log(self, message):
        timestamp = time.strftime("[%H:%M:%S]")
        print(f"{timestamp} {message}") # Mirror to terminal
        try:
            self.log_box.insert("end", f"{timestamp} {message}\n")
            self.log_box.see("end")
        except: pass

    def start_monitor(self):
        if not self.monitoring:
            self.monitoring = True
            self.start_btn.configure(state="disabled")
            self.stop_btn.configure(state="normal")
            self.status_label.configure(text="SERVER STATUS: RUNNING (ACTIVE)", text_color="#00C853")
            self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True)
            self.monitor_thread.start()

    def stop_monitor(self):
        self.monitoring = False
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")

    def monitor_loop(self):
        self.solve_cloudflare()
        while self.monitoring:
            self.log("🚀 Sweep Cycle Starting...")
            try:
                self.scrape_shelflife()
                if not self.monitoring: break
                self.scrape_lemkus()
                if not self.monitoring: break
                self.scrape_archive()
                if not self.monitoring: break
                self.scrape_amazon()
            except Exception as e:
                self.log(f"❌ Cycle Error: {e}")
            
            if self.monitoring:
                self.log("💤 Sleeping 60s...")
                for _ in range(60):
                    if not self.monitoring: break
                    time.sleep(1)
        self.log("✅ Halted.")

    def solve_cloudflare(self):
        self.log("🛡️ Initializing Stealth Session for Shelflife API...")
        try:
            options = uc.ChromeOptions()
            options.add_argument('--window-size=1280,720')
            # Pointing directly to the products page so it solves for the whole domain
            driver = uc.Chrome(options=options)
            driver.get('https://www.shelflife.co.za/products')
            time.sleep(12) 
            cookies = driver.get_cookies()
            self.session_cookies = {c['name']: c['value'] for c in cookies}
            self.user_agent = driver.execute_script("return navigator.userAgent")
            driver.quit()
            self.log("✅ Session Authenticated. Full JSON access enabled.")
        except Exception as e:
            self.log(f"❌ Stealth Error: {e}")

    def scrape_shelflife(self):
        total_skus = 0
        self.log("🔍 Fetching Shelflife Full Inventory (Deep Scrape)...")
        # Loop through pages to get full catalog
        for page in range(1, 5): 
            if not self.monitoring: break
            url = f"https://www.shelflife.co.za/products.json?page={page}"
            headers = {
                "User-Agent": self.user_agent,
                "Accept": "application/json",
                "Referer": "https://www.shelflife.co.za/products"
            }
            try:
                r = requests.get(url, headers=headers, cookies=self.session_cookies, impersonate="chrome110")
                if r.status_code == 200:
                    results = r.json().get('results', {}).get('results', [])
                    if not results: break # No more pages
                    
                    sync_items = []
                    for idx, item in enumerate(results):
                        if not item: continue
                        p = item.get('result', {})
                        if not p: continue
                        title = p.get('title', 'Unknown')
                        
                        # Sneaker-only filter (Category 1 is Footwear, 5 is Sneakers)
                        cats = [(c or {}).get('id') for c in (p.get('categories') or [])]
                        if 1 not in cats and 5 not in cats:
                            continue
                        
                        p_price = p.get('price') or p.get('formatted_price')
                        
                        for sku in (p.get('skus') or []):
                            if not sku: continue
                            # Comprehensive size lookup
                            size = (sku.get('size') or {}).get('title') or \
                                   sku.get('size_title') or \
                                   sku.get('title', '').split('-')[0].strip() or \
                                   'N/A'
                            
                            # Price logic with fallback and cleaning
                            raw_price = sku.get('price') or p_price
                            val = 0
                            if raw_price:
                                if isinstance(raw_price, (int, float)):
                                    val = float(raw_price)
                                else:
                                    try:
                                        # Clean currency symbols and spaces
                                        for char in ['R', '\u00a0', ' ', '\t', '\r', '\n']:
                                            raw_price = str(raw_price).replace(char, '')
                                        
                                        # Normalize decimal separator
                                        if ',' in raw_price and '.' not in raw_price:
                                            raw_price = raw_price.replace(',', '.')
                                        elif ',' in raw_price and '.' in raw_price:
                                            raw_price = raw_price.replace(',', '')
                                        
                                        val = float(raw_price)
                                    except: val = 0

                            # Debug log for the first few items of page 1 to confirm logic works
                            if page == 1 and idx < 2:
                                self.log(f"🔎 DEBUG [Shelflife]: {title} | Size: {size} | Price: {val} (Raw: {raw_price})")

                            sync_items.append({
                                'sid': str(sku.get('id')),
                                'title': title,
                                'sz': str(size),
                                'soh': int(sku.get('soh', 0)),
                                'price': val,
                                'url': p.get('url') # Shelflife provides full URL
                            })
                    self.sync_multi(sync_items, "Shelflife")
                    total_skus += len(sync_items)
                    time.sleep(2) 
                elif r.status_code == 403:
                    self.log("❗ Shelflife session expired. Renewing...")
                    self.solve_cloudflare()
                    return 
                else:
                    self.log(f"❌ Shelflife API Error: {r.status_code}")
            except Exception as e:
                self.log(f"⚠️ Shelflife Page Error: {str(e)}")
                break
        self.log(f"✅ Shelflife Deep Sync Complete ({total_skus} SKUs).")

    def scrape_lemkus(self):
        url = "https://www.lemkus.com/products.json?limit=250"
        try:
            r = requests.get(url, impersonate="chrome110")
            if r.status_code == 200:
                prods = r.json().get('products', [])
                sync_items = []
                for p in prods:
                    # Sneaker-only filter
                    pt = p.get('product_type', '').lower()
                    if 'footwear' not in pt and 'sneaker' not in pt:
                        continue

                    t = p.get('title', 'Unknown')
                    handle = p.get('handle')
                    p_url = f"https://www.lemkus.com/products/{handle}" if handle else ""
                    for v in p.get('variants', []):
                        sync_items.append({
                            'sid': str(v.get('id')),
                            'title': t,
                            'sz': str(v.get('title', 'N/A')),
                            'soh': 1 if v.get('available', False) else 0,
                            'price': float(v.get('price', 0)),
                            'url': p_url
                        })
                self.sync_multi(sync_items, "Jack Lemkus")
                self.log(f"✅ Lemkus Sync Success ({len(sync_items)} SKUs).")
            else:
                self.log(f"❌ Lemkus API Error: {r.status_code}")
        except Exception as e:
            self.log(f"⚠️ Lemkus Error: {e}")

    def scrape_archive(self):
        self.log("🔍 Fetching Archive (Enriched Deep Scrape)...")
        search_url = "https://web-api.bash.com/v1/search/bloomreach?page=1&pageSize=40&orderBy=OrderByReleaseDateDESC&text=sneakers&persistentFilters=store%3AArchive"
        try:
            r = requests.get(search_url, impersonate="chrome110")
            if r.status_code == 200:
                base_items = r.json().get('data', {}).get('items', [])
                if not base_items: return
                
                # Map VTEX ID to metadata
                vtex_ids = []
                prod_map = {} 
                for bi in base_items:
                    vid = str(bi.get('vtex_id') or bi.get('id'))
                    if vid:
                        vtex_ids.append(vid)
                        prod_map[vid] = bi

                # Batch fetch sizes from VTEX API (max 20 per call for reliability)
                sync_items = []
                for i in range(0, len(vtex_ids), 20):
                    batch_ids = vtex_ids[i:i+20]
                    fv_query = "&".join([f"fq=productId:{id}" for id in batch_ids])
                    vtex_url = f"https://bash.com/api/catalog_system/pub/products/search?{fv_query}"
                    
                    vr = requests.get(vtex_url, impersonate="chrome110")
                    if vr.status_code == 200:
                        v_products = vr.json()
                        for vp in v_products:
                            pid = str(vp.get('productId'))
                            original_meta = prod_map.get(pid, {})
                            
                            p_url = original_meta.get('url')
                            if p_url and not p_url.startswith('http'):
                                p_url = f"https://bash.com{p_url}"
                            
                            # Every 'item' in VTEX is a Size variant
                            for itm in vp.get('items', []):
                                sizes = itm.get('Size') or itm.get('variations', [])
                                size_label = str(sizes[0]) if sizes else "Multi"
                                
                                # Stock & Price from commercial offer
                                sellers = itm.get('sellers', [])
                                if not sellers: continue
                                offer = sellers[0].get('commertialOffer', {})
                                
                                sync_items.append({
                                    'sid': str(itm.get('itemId')),
                                    'title': original_meta.get('name', vp.get('productName', 'N/A')),
                                    'sz': size_label,
                                    'soh': 1 if offer.get('AvailableQuantity', 0) > 0 else 0,
                                    'price': float(offer.get('Price', 0)),
                                    'url': p_url
                                })
                
                if sync_items:
                    self.sync_multi(sync_items, "Archive")
                    self.log(f"✅ Archive Sync Success ({len(sync_items)} SKUs).")
            else:
                self.log(f"❌ Archive API Error: {r.status_code}")
        except Exception as e:
            self.log(f"⚠️ Archive Error: {e}")

    def scrape_amazon(self):
        self.log("🔍 Fetching Amazon.co.za (Puma Stealth Scrape)...")
        try:
            options = uc.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--window-size=1280,720')
            driver = uc.Chrome(options=options)
            
            url = "https://www.amazon.co.za/s?k=Puma+Sneakers&ref=nb_sb_noss"
            driver.get(url)
            time.sleep(8) 
            
            # Extract via JavaScript with verified amazon.co.za selectors
            items = driver.execute_script("""
                const res = [];
                document.querySelectorAll('.s-result-item[data-asin]').forEach(el => {
                    const t = el.querySelector('h2 a span')?.innerText;
                    // Try hidden price first (usually R 1,299.00) then visual whole price
                    let p = el.querySelector('.a-price .a-offscreen')?.innerText || 
                            el.querySelector('.a-price-whole')?.innerText;
                    const u = el.querySelector('h2 a')?.href;
                    const id = el.getAttribute('data-asin');
                    if(t && p && u && id && id.length > 5) {
                        res.push({ title: t, price: p, url: u, sid: id });
                    }
                });
                return res;
            """)
            driver.quit()
            
            sync_items = []
            for itm in items:
                try: 
                    # Clean Amazon formatting ('R 1,299.00' or '1,299')
                    p_str = itm['price'].replace('R', '').replace(',', '').replace('\u00a0', '').replace(' ', '').replace('.00', '').strip()
                    p_val = float(p_str)
                except: p_val = 0
                
                sync_items.append({
                    'sid': f"AMZ_{itm['sid']}",
                    'title': itm['title'],
                    'sz': "Multi",
                    'soh': 1,
                    'price': p_val,
                    'url': itm['url']
                })
            
            if sync_items:
                self.sync_multi(sync_items, "Amazon")
                self.log(f"✅ Amazon Sync Success ({len(sync_items)} items).")
            else:
                self.log("⚠️ Amazon: No items found in search.")
        except Exception as e:
            self.log(f"⚠️ Amazon Error: {str(e)}")

    def sync_multi(self, items, store):
        """Processes a list of items with restock and sale detection using Firestore batches."""
        try:
            # 1. Fetch current database state for these SKUs
            sids = [str(i['sid']) for i in items]
            existing_data = {}
            
            # Fetch in chunks of 500 (Firestore get_all limit is 1000, but 500 is safer)
            for i in range(0, len(sids), 500):
                chunk = sids[i:i + 500]
                refs = [self.db.collection("stock").document(sid) for sid in chunk]
                docs = self.db.get_all(refs)
                for doc in docs:
                    if doc.exists:
                        existing_data[doc.id] = doc.to_dict()

            batch = self.db.batch()
            count = 0
            for item in items:
                sid = str(item['sid'])
                ref = self.db.collection("stock").document(sid)
                
                old_state = existing_data.get(sid, {})
                old_soh = old_state.get('soh', 0)
                old_price = old_state.get('current_price', item['price'])
                original_price = old_state.get('original_price', item['price'])
                
                update_data = {
                    "sku_id": sid,
                    "product_title": item['title'],
                    "size_title": item['sz'],
                    "soh": item['soh'],
                    "current_price": item['price'],
                    "original_price": original_price,
                    "last_updated": firestore.SERVER_TIMESTAMP,
                    "store": store,
                    "url": item.get('url', '')
                }

                # --- RESTOCK DETECTION ---
                if item['soh'] > 0 and old_soh == 0:
                    self.log(f"🔥 RESTOCK: {item['title']} ({item['sz']})")
                    log_ref = self.db.collection("restock_logs").document()
                    batch.set(log_ref, {
                        "type": "RESTOCK",
                        "sku_id": sid,
                        "product_title": item['title'],
                        "size_title": item['sz'],
                        "quantity_added": item['soh'],
                        "detected_at": firestore.SERVER_TIMESTAMP,
                        "store": store
                    })
                    update_data["restocked_at"] = firestore.SERVER_TIMESTAMP

                # --- SALE DETECTION ---
                elif item['price'] < old_price and item['price'] > 0:
                    self.log(f"📉 SALE: {item['title']} dropped to R{item['price']}")
                    log_ref = self.db.collection("restock_logs").document()
                    batch.set(log_ref, {
                        "type": "SALE",
                        "sku_id": sid,
                        "product_title": item['title'],
                        "size_title": item['sz'],
                        "price_at_event": item['price'],
                        "detected_at": firestore.SERVER_TIMESTAMP,
                        "store": store
                    })

                # --- FIRST SYNC INITIALIZATION ---
                if not old_state:
                    update_data["created_at"] = firestore.SERVER_TIMESTAMP

                batch.set(ref, update_data, merge=True)
                
                count += 1
                if count >= 400:
                    batch.commit()
                    batch = self.db.batch()
                    count = 0
            
            if count > 0:
                batch.commit()
        except Exception as e:
            self.log(f"❌ Sync Error: {e}")

    def on_closing(self):
        self.monitoring = False
        self.destroy()

if __name__ == "__main__":
    app = SoleNodeApp()
    app.mainloop()
