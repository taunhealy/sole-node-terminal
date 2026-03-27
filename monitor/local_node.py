import os
import time
import logging
import sys
import socket
import threading
from curl_cffi import requests
from google.cloud import firestore
import undetected_chromedriver as uc

# Force Local Service Account Credentials 
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "service-account-key.json")

# Configure logger
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', datefmt='%H:%M:%S', stream=sys.stdout)
logger = logging.getLogger("CLOUD_NODE")

class SoleNode:
    def __init__(self):
        self.db = firestore.Client()
        self.node_id = socket.gethostname() or "node-unknown"
        self.monitoring = False
        
        # Default State
        self.config = {
            "active_stores": ["Shelflife", "Jack Lemkus", "Archive"],
            "scraping_speed": "anticipation",
            "is_active": True
        }
        
        # Hive Signal Cache (prevents spamming same SKU signals)
        self.signal_cache = {} # sku_id -> last_emit_time
        
        # Sniper Tasks & Keywords
        self.active_tasks = [] # List of keyword-based task dicts
        self.wishlist_items = [] # List of product titles from user_alerts
        self.target_user = "taunhealy@gmail.com" # Default admin for this node fleet
        
        self.init_node_registry()
        self.start_remote_listener()
        self.start_heartbeat()
        self.start_task_sync()

    def start_task_sync(self):
        """Listen to Wishlist and Manual Tasks for the target user"""
        logger.info(f"🧬 Syncing Sniper Tasks for: {self.target_user}")
        
        # 1. Wishlist Sync
        def wishlist_on_snapshot(docs, changes, read_time):
            self.wishlist_items = [d.to_dict().get('product_title') for d in docs if d.exists]
            logger.info(f"📋 Wishlist Synced: {len(self.wishlist_items)} items")

        self.db.collection("user_alerts").where("user_email", "==", self.target_user).on_snapshot(wishlist_on_snapshot)

        # 2. Manual Sniper Tasks Sync
        def tasks_on_snapshot(docs, changes, read_time):
            self.active_tasks = [d.to_dict() for d in docs if d.exists and d.to_dict().get('is_active', True)]
            logger.info(f"🎯 Sniper Tasks Synced: {len(self.active_tasks)} active tasks")

        self.db.collection("sniper_tasks").on_snapshot(tasks_on_snapshot)

    def is_target_item(self, title):
        """Check if an item title matches any Wishlist or Manual Task keyword"""
        title_lower = title.lower()
        
        # Check Wishlist (Direct Match)
        if any(w.lower() in title_lower for w in self.wishlist_items):
            return True
            
        # Check Manual Tasks (Keyword Match)
        for task in self.active_tasks:
            keywords = [k.lower().strip() for k in task.get('keywords', [])]
            if not keywords: continue
            if all(k in title_lower for k in keywords):
                return True
        
        return False

    def emit_hive_signal(self, sku_id, title, store, soh, priority=False):
        """Broadcasts a restock event to the global hive for community sync"""
        now = time.time()
        
        # Cooldown: 10 mins for normal, 2 mins for priority/task hits
        cooldown = 120 if priority else 600
        
        if sku_id in self.signal_cache and (now - self.signal_cache[sku_id]) < cooldown:
            return
            
        logger.info(f"📡 {'🔥 PRIORITY' if priority else 'HIVE'} BROADCAST: {title} ({store}) - SOH: {soh}")
        try:
            self.db.collection("hive_signals").add({
                "sku_id": sku_id,
                "product_title": title,
                "store": store,
                "soh": soh,
                "node_id": self.node_id,
                "priority": priority,
                "detected_at": firestore.SERVER_TIMESTAMP
            })
            self.signal_cache[sku_id] = now
        except Exception as e:
            logger.error(f"❌ Hive Broadcast Error: {e}")

    def init_node_registry(self):
        """Self-register node in Firestore"""
        logger.info(f"🆔 Node Registration: {self.node_id}")
        doc_ref = self.db.collection("active_nodes").document(self.node_id)
        doc = doc_ref.get()
        if not doc.exists:
            doc_ref.set({
                "node_name": self.node_id,
                "status": "online",
                "active_stores": self.config["active_stores"],
                "scraping_speed": self.config["scraping_speed"],
                "last_seen": firestore.SERVER_TIMESTAMP,
                "is_active": True,
                "version": "1.8.2-cloud",
                "platform": sys.platform
            })
        else:
            self.config.update(doc.to_dict())

    def start_remote_listener(self):
        """Listen for dashboard commands"""
        logger.info("📡 Remote Command Listener Active.")
        doc_ref = self.db.collection("active_nodes").document(self.node_id)

        def on_snapshot(doc_snapshot, changes, read_time):
            for doc in doc_snapshot:
                data = doc.to_dict()
                if data:
                    logger.info(f"🔄 Syncing Config: {data.get('scraping_speed')} | {len(data.get('active_stores', []))} stores")
                    self.config.update(data)
                    
                    if not data.get("is_active", True):
                        self.monitoring = False
                    elif data.get("is_active", True) and not self.monitoring:
                        self.start_monitoring_thread()

        doc_ref.on_snapshot(on_snapshot)

    def start_heartbeat(self):
        """Report vitality to Dashboard every 30s"""
        def heartbeat_loop():
            while True:
                try:
                    self.db.collection("active_nodes").document(self.node_id).update({
                        "last_seen": firestore.SERVER_TIMESTAMP,
                        "status": "active" if self.monitoring else "online"
                    })
                except Exception as e:
                    logger.warning(f"💓 Pulse Error: {e}")
                time.sleep(30)
        
        threading.Thread(target=heartbeat_loop, daemon=True).start()

    def start_monitoring_thread(self):
        if self.monitoring: return
        self.monitoring = True
        threading.Thread(target=self.run_loop, daemon=True).start()

    def run_loop(self):
        logger.info(f"🚀 Sniper Engine [v1.8.2] Engaged on {self.node_id}")
        while self.monitoring:
            try:
                stores = self.config.get("active_stores", [])
                
                if "Shelflife" in stores: self.scrape_shelflife()
                if "Jack Lemkus" in stores: self.scrape_lemkus()
                if "Archive" in stores: self.scrape_archive()
                if "Amazon" in stores: self.scrape_amazon()

                speed = self.config.get("scraping_speed", "anticipation")
                sleep_map = {"idle": 3600, "anticipation": 60, "sniper": 2}
                sleep_time = sleep_map.get(speed, 60)
                
                logger.info(f"💤 Cycle Complete. Sleeping {sleep_time}s ({speed})")
                time.sleep(sleep_time)

            except Exception as e:
                logger.error(f"❌ Engine Error: {e}")
                time.sleep(10)
        logger.info("🛑 Sniper Engine Disengaged.")

    def scrape_shelflife(self):
        target_url = "https://www.shelflife.co.za/products.json"
        headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json", "Referer": "https://www.shelflife.co.za/products"}
        try:
            r = requests.get(target_url, headers=headers, timeout=20, impersonate="chrome110")
            if r.status_code != 200: return
            for p_entry in r.json().get('results', {}).get('results', []):
                p = p_entry.get('result', {})
                for sku in (p.get('skus') or []):
                    sku_id = str(sku.get('id', ''))
                    if not sku_id: continue
                    ref = self.db.collection("stock").document(sku_id)
                    
                    # --- HIVE INTELLIGENCE: Restock Detection ---
                    soh = int(sku.get('soh', 0))
                    title = p.get('title')
                    is_priority = self.is_target_item(title)
                    
                    if soh > 0:
                        doc = ref.get(['soh'])
                        if not doc.exists or doc.to_dict().get('soh', 0) == 0:
                           self.emit_hive_signal(sku_id, title, "Shelflife", soh, priority=is_priority)

                    ref.set({
                        "sku_id": sku_id, "product_title": title, "soh": soh,
                        "current_price": float(str(sku.get('price') or p.get('price')).replace('R','').replace(',','').strip()),
                        "store": "Shelflife", "last_updated": firestore.SERVER_TIMESTAMP,
                        "is_priority_hit": is_priority
                    }, merge=True)
        except Exception as e: logger.error(f"Shelflife Sync Error: {e}")

    def scrape_lemkus(self):
        url = "https://www.lemkus.com/products.json?limit=250"
        try:
            r = requests.get(url, impersonate="chrome110")
            if r.status_code != 200: return
            for p in r.json().get('products', []):
                for v in p.get('variants', []):
                    vid = str(v.get('id'))
                    ref = self.db.collection("stock").document(vid)
                    
                    soh = 1 if v.get('available') else 0
                    title = p.get('title')
                    is_priority = self.is_target_item(title)
                    
                    if soh > 0:
                        doc = ref.get(['soh'])
                        if not doc.exists or doc.to_dict().get('soh', 0) == 0:
                            self.emit_hive_signal(vid, title, "Jack Lemkus", soh, priority=is_priority)

                    ref.set({
                        "sku_id": vid, "product_title": title, "soh": soh,
                        "current_price": float(v.get('price', 0)), "store": "Jack Lemkus", "last_updated": firestore.SERVER_TIMESTAMP,
                        "is_priority_hit": is_priority
                    }, merge=True)
        except Exception as e: logger.error(f"Lemkus Sync Error: {e}")

    def scrape_archive(self):
        url = "https://web-api.bash.com/v1/search/bloomreach?page=1&pageSize=40&orderBy=OrderByReleaseDateDESC&text=sneakers&persistentFilters=store%3AArchive"
        try:
            r = requests.get(url, impersonate="chrome110")
            if r.status_code != 200: return
            items = r.json().get('data', {}).get('items', [])
            for i in items:
                sid = str(i.get('vtex_id') or i.get('id'))
                ref = self.db.collection("stock").document(sid)
                ref.set({
                    "sku_id": sid, "product_title": i.get('name'), "soh": 1, 
                    "current_price": float(i.get('price', 0)), "store": "Archive", "last_updated": firestore.SERVER_TIMESTAMP
                }, merge=True)
        except Exception as e: logger.error(f"Archive Sync Error: {e}")

    def scrape_amazon(self):
        logger.info("🔍 Scrapping Amazon (Stealth Mode)...")
        # Headless UC Implementation ...
        pass

if __name__ == "__main__":
    node = SoleNode()
    if node.config.get("is_active", True):
        node.start_monitoring_thread()
    while True:
        time.sleep(1)
