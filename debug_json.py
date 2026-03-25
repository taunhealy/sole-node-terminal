import time
import json
import os
import sys
from curl_cffi import requests
import undetected_chromedriver as uc

def solve_cloudflare():
    options = uc.ChromeOptions()
    options.add_argument('--window-size=1280,720')
    driver = uc.Chrome(options=options)
    driver.get('https://www.shelflife.co.za/products')
    time.sleep(15) 
    cookies = driver.get_cookies()
    session_cookies = {c['name']: c['value'] for c in cookies}
    user_agent = driver.execute_script("return navigator.userAgent")
    driver.quit()
    return session_cookies, user_agent

def debug_shelflife():
    cookies, ua = solve_cloudflare()
    # Check multiple pages to find the shoe
    for page in range(1, 4):
        print(f"FETCHING PAGE {page}...")
        url = f"https://www.shelflife.co.za/products.json?page={page}"
        headers = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Referer": "https://www.shelflife.co.za/products"
        }
        r = requests.get(url, headers=headers, cookies=cookies, impersonate="chrome110")
        if r.status_code == 200:
            data = r.json()
            results = data.get('results', {}).get('results', [])
            for item in results:
                p = item.get('result', {})
                for sku in p.get('skus', []):
                    if str(sku.get('id')) == "121897" or "nike dunk" in p.get('title', '').lower():
                        print(f"FOUND MATCH: {p.get('title')} (ID: {sku.get('id')})")
                        print(f"Price field: {p.get('price')} (Type: {type(p.get('price'))})")
                        print(f"SKU Price field: {sku.get('price')} (Type: {type(sku.get('price'))})")
                        print(f"Formatted: {p.get('formatted_price')}")
                        return
        else:
            print(f"FAILED PAGE {page}: {r.status_code}")
    print("FINISHED ALL PAGES. Match not found.")

if __name__ == "__main__":
    debug_shelflife()
