import os
import sys
import time
from curl_cffi import requests
from bs4 import BeautifulSoup
from google.cloud import firestore

# Firebase Setup
def get_resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

CRED_PATH = get_resource_path("service-account-key.json")
if os.path.exists(CRED_PATH):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CRED_PATH

db = firestore.Client()

STORES = {
    "Jack Lemkus": {
        "url": "https://www.lemkus.com/blogs/news",
        "selector": "a.article-card__title",
        "base_url": "https://www.lemkus.com"
    },
    "Archive": {
        "url": "https://blog.archivestore.co.za/news/",
        "selector": "h3.pp-post-title a",
        "base_url": ""
    },
    "Shelflife": {
        "url": "https://www.shelflife.co.za/blog",
        "selector": ".blog-post-title a, .post-title a", # Common selectors for their platform
        "base_url": "https://www.shelflife.co.za"
    },
    "Nice Kicks": {
        "url": "https://www.nicekicks.com/category/sneaker-news/",
        "selector": "h2.entry-title a",
        "base_url": ""
    }
}

def scrape_blogs():
    print(">>> 📚 Starting Blog Intelligence Sweep...")
    
    for store_name, config in STORES.items():
        print(f">>> 🔍 Checking {store_name}...")
        try:
            # Using impersonate to bypass simple bot checks
            resp = requests.get(config["url"], impersonate="chrome110", timeout=15)
            if resp.status_code != 200:
                print(f">>> ❌ Failed to load {store_name}: {resp.status_code}")
                continue
                
            soup = BeautifulSoup(resp.text, 'html.parser')
            posts = soup.select(config["selector"])
            
            new_count = 0
            for post in posts[:5]: # Only get latest 5
                title = post.get_text(strip=True)
                link = post.get('href')
                
                if not link.startswith('http'):
                    link = config["base_url"] + link
                
                # Check for existing
                doc_id = f"{store_name}_{title}".replace(" ", "_").replace("/", "_")[:100]
                doc_ref = db.collection("store_blogs").document(doc_id)
                
                if not doc_ref.get().exists:
                    doc_ref.set({
                        "title": title,
                        "url": link,
                        "store": store_name,
                        "detected_at": firestore.SERVER_TIMESTAMP
                    })
                    new_count += 1
            
            print(f">>> ✅ {store_name}: {new_count} new entries found.")
            
        except Exception as e:
            print(f">>> ❌ Error scraping {store_name}: {str(e)}")

if __name__ == "__main__":
    while True:
        scrape_blogs()
        print(">>> ⏳ Sleeping for 1 hour...")
        time.sleep(3600)
