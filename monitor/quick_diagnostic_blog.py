from curl_cffi import requests
from bs4 import BeautifulSoup

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
        "selector": ".blog-post-title a, .post-title a",
        "base_url": "https://www.shelflife.co.za"
    }
}

for store, config in STORES.items():
    print(f"\n--- {store} ---")
    try:
        resp = requests.get(config["url"], impersonate="chrome110", timeout=15)
        print(f"Status: {resp.status_code}")
        soup = BeautifulSoup(resp.text, 'html.parser')
        posts = soup.select(config["selector"])
        print(f"Found {len(posts)} posts with selector '{config['selector']}'")
        for i, post in enumerate(posts[:3]):
             print(f"  {i+1}. {post.get_text(strip=True)} -> {post.get('href')}")
    except Exception as e:
        print(f"Error: {e}")
