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

        self.title("SoleNode.io | v1.6 Deep Scraper [Timberland Edition]")
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
        self.log_box.insert("0.0", ">>> SoleNode Terminal v1.6 [Cloud Stealth] Initialized.\n>>> 🟢 Database: Connected\n>>> 🛡️ Amazon Bypass: Active\n")

    def log(self, message):
        timestamp = time.strftime("[%H:%M:%S]")
        print(f"{timestamp} {message}")
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
                if not self.monitoring: break
                self.scrape_capeunion()
            except Exception as e:
                self.log(f"❌ Cycle Error: {e}")
            
            if self.monitoring:
                self.log("💤 Sleeping 120s...")
                for _ in range(120):
                    if not self.monitoring: break
                    time.sleep(1)
        self.log("✅ Halted.")

    def solve_cloudflare(self):
        self.log("🛡️ Initializing Stealth Session for Shelflife API...")
        try:
            options = uc.ChromeOptions()
            options.add_argument('--window-size=1280,720')
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
        for page in range(1, 3): 
            if not self.monitoring: break
            url = f"https://www.shelflife.co.za/products.json?page={page}"
            headers = {"User-Agent": self.user_agent, "Accept": "application/json", "Referer": "https://www.shelflife.co.za/products"}
            try:
                r = requests.get(url, headers=headers, cookies=self.session_cookies, impersonate="chrome110")
                if r.status_code == 200:
                    results = r.json().get('results', {}).get('results', [])
                    if not results: break
                    
                    sync_items = []
                    for item in results:
                        p = item.get('result', {})
                        if not p: continue
                        title = p.get('title', 'Unknown')
                        color = p.get('color') or '—'
                        for sku in (p.get('skus') or []):
                            if not sku: continue
                            size = sku.get('size_title') or (sku.get('size') or {}).get('title') or 'N/A'
                            raw_price = sku.get('price') or p.get('price')
                            try: p_val = float(str(raw_price).replace('R','').replace(',','').replace(' ','').strip())
                            except: p_val = 0
                            sync_items.append({
                                'sid': str(sku.get('id')), 'title': title, 'sz': str(size), 'color': color,
                                'soh': int(sku.get('soh', 0)), 'price': p_val, 'url': p.get('url','')
                            })
                    self.log(f"💎 Shelflife found {len(sync_items)} SKUs on Page {page}")
                    self.sync_multi(sync_items, "Shelflife")
                    total_skus += len(sync_items)
                    time.sleep(1) 
            except Exception as e: self.log(f"⚠️ Shelflife Page Error: {e}"); break
        self.log(f"✅ Shelflife Sync Complete. Total {total_skus} SKUs.")

    def scrape_lemkus(self):
        self.log("🔍 Fetching Jack Lemkus (Structured Data)...")
        url = "https://www.lemkus.com/products.json?limit=250"
        try:
            r = requests.get(url, impersonate="chrome110")
            if r.status_code == 200:
                prods = r.json().get('products', [])
                sync_items = []
                for p in prods:
                    options = p.get('options', [])
                    c_idx, s_idx = -1, -1
                    for i, o in enumerate(options):
                        on = o.get('name','').lower()
                        if 'color' in on: c_idx = i
                        if 'size' in on: s_idx = i
                    for v in p.get('variants', []):
                        color, size = "—", v.get('title', 'N/A')
                        vopts = [v.get('option1'), v.get('option2'), v.get('option3')]
                        if c_idx != -1 and vopts[c_idx]: color = vopts[c_idx]
                        if s_idx != -1 and vopts[s_idx]: size = vopts[s_idx]
                        sync_items.append({
                            'sid': str(v.get('id')), 'title': p.get('title'), 'sz': str(size), 'color': color,
                            'soh': 1 if v.get('available') else 0, 'price': float(v.get('price', 0)),
                            'url': f"https://www.lemkus.com/products/{p.get('handle')}"
                        })
                self.log(f"🏆 Lemkus found {len(sync_items)} SKUs")
                self.sync_multi(sync_items, "Jack Lemkus")
        except Exception as e: self.log(f"⚠️ Lemkus Error: {e}")

    def scrape_archive(self):
        self.log("🔍 Fetching Archive (VTEX Deep Scrape)...")
        search_url = "https://web-api.bash.com/v1/search/bloomreach?page=1&pageSize=40&orderBy=OrderByReleaseDateDESC&text=sneakers&persistentFilters=store%3AArchive"
        try:
            r = requests.get(search_url, impersonate="chrome110")
            if r.status_code != 200: return
            base_items = r.json().get('data', {}).get('items', [])
            vtex_ids, meta_map = [], {}
            for bi in base_items:
                vid = str(bi.get('vtex_id') or bi.get('id'))
                vtex_ids.append(vid)
                meta_map[vid] = {'color': bi.get('baseColor') or bi.get('color', '—'), 'url': bi.get('url'), 'name': bi.get('name')}
            sync_items = []
            for i in range(0, len(vtex_ids), 10):
                batch = vtex_ids[i:i+10]
                fq = "&".join([f"fq=productId:{id}" for id in batch])
                vr = requests.get(f"https://bash.com/api/catalog_system/pub/products/search?{fq}", impersonate="chrome110")
                if vr.status_code == 200:
                    for vp in vr.json():
                        pid = str(vp.get('productId'))
                        m = meta_map.get(pid, {})
                        for itm in vp.get('items', []):
                            offer = itm.get('sellers', [{}])[0].get('commertialOffer', {})
                            p_url = f"https://bash.com{m.get('url','')}"
                            sync_items.append({
                                'sid': str(itm.get('itemId')), 'title': m.get('name', 'N/A'),
                                'sz': str(itm.get('Size', ['Multi'])[0]), 'color': m.get('color', '—'),
                                'soh': int(offer.get('AvailableQuantity', 0)), 'price': float(offer.get('Price', 0)),
                                'url': p_url
                            })
                self.log(f"👟 Archive Sync: {len(sync_items)} SKUs processed via VTEX API")
                self.sync_multi(sync_items, "Archive")
        except Exception as e: self.log(f"⚠️ Archive Error: {e}")

    def scrape_amazon(self):
        self.log("🔍 Fetching Amazon.co.za (Timberland / Puma)...")
        try:
            options = uc.ChromeOptions()
            options.add_argument('--headless=new')
            driver = uc.Chrome(options=options)
            keywords = ["timberland", "puma sneakers"]
            for kw in keywords:
                driver.get(f"https://www.amazon.co.za/s?k={kw.replace(' ', '+')}")
                time.sleep(6)
                res = driver.execute_script("""
                    const found = [];
                    document.querySelectorAll('.s-result-item[data-asin]').forEach(el => {
                        const t = el.querySelector('h2 a span')?.innerText;
                        const p = el.querySelector('.a-price .a-offscreen')?.innerText || el.querySelector('.a-price-whole')?.innerText;
                        const u = el.querySelector('h2 a')?.href;
                        const id = el.getAttribute('data-asin');
                        if(t && p && id && id.length > 5) found.push({ t, p, u, id });
                    });
                    return found;
                """) or []
                sync_items = []
                for itm in res:
                    try: val = float(str(itm['p']).replace('R','').replace(',','').replace(' ','').strip())
                    except: val = 0
                    sync_items.append({
                        'sid': f"AMZN_{itm['id']}", 'title': itm['t'], 'sz': "Multi", 'color': "—",
                        'soh': 1, 'price': val, 'url': itm['u']
                    })
                self.log(f"📦 Amazon result for '{kw}': {len(sync_items)} items synced")
                self.sync_multi(sync_items, "Amazon")
            driver.quit()
        except Exception as e: self.log(f"⚠️ Amazon Error: {e}")

    def scrape_capeunion(self):
        self.log("🔍 Fetching Cape Union Mart (Trail / Footwear)...")
        try:
            options = uc.ChromeOptions()
            options.add_argument('--headless=new')
            driver = uc.Chrome(options=options)
            urls = [
                "https://www.capeunionmart.co.za/footwear/running/trail-running-shoes/",
                "https://www.capeunionmart.co.za/c/women-footwear",
                "https://www.capeunionmart.co.za/c/men-footwear"
            ]
            for url in urls:
                self.log(f"👟 Scanning: {url.split('/')[-1] or url.split('/')[-2]}")
                driver.get(url)
                time.sleep(8)
                items = driver.execute_script("""
                    const prods = [];
                    // Cape Union Mart modern Chakra UI pattern
                    document.querySelectorAll('.chakra-linkbox').forEach(tile => {
                        const linkEl = tile.querySelector('a.chakra-linkbox__overlay') || tile.querySelector('a');
                        const url = linkEl?.href || '';
                        
                        // Extract PID from URL pattern /ID.html
                        const pidMatch = url.match(/\/([^\/]+)\.html$/);
                        const pid = pidMatch ? pidMatch[1] : null;
                        
                        // Extract Name (Typically a <p> or the first text node)
                        const name = tile.querySelector('p')?.innerText || tile.innerText.split('\\n')[0];
                        
                        // Extract Price (Look for R value)
                        const priceMatch = tile.innerText.match(/R\s?[\d,.]+/);
                        const price = priceMatch ? priceMatch[0] : null;

                        if(pid && name && price) {
                            prods.push({ pid, name, price, link: url });
                        }
                    });
                    return prods;
                """) or []
                
                sync_items = []
                for itm in items:
                    try: val = float(str(itm['price']).replace('R','').replace(',','').replace(' ','').strip())
                    except: val = 0
                    sync_items.append({
                        'sid': f"CUM_{itm['pid']}", 'title': itm['name'], 'sz': "See Site", 'color': "—",
                        'soh': 1, 'price': val, 'url': itm['u'] if 'u' in itm else itm['link']
                    })
                self.log(f"🏜️ Cape Union Mart found {len(sync_items)} items")
                self.sync_multi(sync_items, "Cape Union Mart")
            driver.quit()
        except Exception as e: self.log(f"⚠️ Cape Union Error: {e}")

    def sync_multi(self, items, store):
        if not self.db: return
        try:
            # 1. Fetch current state to detect changes & restocks
            sids = [str(i['sid']) for i in items]
            existing_data = {}
            
            # Fetch in chunks of 500 (Firestore limit)
            for i in range(0, len(sids), 500):
                chunk = sids[i:i+500]
                refs = [self.db.collection("stock").document(sid) for sid in chunk]
                docs = self.db.get_all(refs)
                for doc in docs:
                    if doc.exists:
                        existing_data[doc.id] = doc.to_dict()

            batch = self.db.batch()
            write_count = 0
            
            for item in items:
                sid = str(item['sid'])
                ref = self.db.collection("stock").document(sid)
                
                old_state = existing_data.get(sid, {})
                old_soh = old_state.get('soh', 0)
                old_price = old_state.get('current_price', 0)
                
                # --- CHANGE DETECTION ---
                has_changed = (item['soh'] != old_soh or item['price'] != old_price)
                
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
                    write_count += 1
                    
                    # Also update restocked_at on the item itself
                    batch.set(ref, {"restocked_at": firestore.SERVER_TIMESTAMP}, merge=True)

                # --- ONLY UPDATE IF CHANGED TO PREVENT DASHBOARD FLICKER ---
                if has_changed or not old_state:
                    batch.set(ref, {
                        "sku_id": sid,
                        "product_title": item['title'],
                        "size_title": item['sz'],
                        "color": item['color'],
                        "soh": item['soh'],
                        "current_price": item['price'],
                        "store": store,
                        "url": item.get('url', ''),
                        "last_updated": firestore.SERVER_TIMESTAMP
                    }, merge=True)
                    write_count += 1
                
                if write_count >= 400:
                    batch.commit()
                    batch = self.db.batch()
                    write_count = 0
            
            if write_count > 0:
                batch.commit()
                
        except Exception as e:
            self.log(f"❌ Sync Error: {e}")

    def on_closing(self):
        self.monitoring = False
        self.destroy()

if __name__ == "__main__":
    app = SoleNodeApp()
    app.mainloop()
