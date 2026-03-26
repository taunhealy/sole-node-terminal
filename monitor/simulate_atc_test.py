import os
import sys
import time
import threading
import undetected_chromedriver as uc

def get_chrome_version():
    try:
        import subprocess, re
        output = subprocess.check_output(r'reg query "HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon" /v version', shell=True)
        version = re.search(r'(\d+)\.', output.decode())
        if version: return int(version.group(1))
    except: pass
    return None

def run_atc_test(url, store_name):
    print(f"🛒 Simulation: Launching Sniper for {store_name}...")
    try:
        options = uc.ChromeOptions()
        options.add_argument('--window-size=1280,1024')
        options.add_argument('--disable-blink-features=AutomationControlled')
        
        driver = uc.Chrome(options=options, version_main=get_chrome_version())
        
        print(f"🚀 Navigating to: {url}")
        driver.get(url)
        
        print(f"⏱️ Waiting for page load...")
        time.sleep(5) 
        
        # Site specific button clicking
        if store_name == "Shelflife":
            print("🔍 Finding 'Add to Bag' button...")
            driver.execute_script("""
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const atc = buttons.find(b => b.innerText.toLowerCase().includes('add to bag') || 
                                            b.innerText.toLowerCase().includes('add to cart'));
                if(atc) {
                    console.log("Found button, clicking...");
                    atc.scrollIntoView();
                    atc.click();
                } else {
                    console.log("Button not found via text");
                }
            """)
        
        print("✅ Simulation Triggered. The browser will stay open for manual takeover.")
        # Hold script open
        while True:
            time.sleep(1)
            
    except Exception as e:
        print(f"❌ Simulation Failed: {e}")

if __name__ == "__main__":
    # Test with a known Shelflife product (or one currently in stock for testing)
    # Using the one from the subagent check
    test_url = "https://www.shelflife.co.za/product/air-jordan-6-retro-women-s-low-blackout"
    run_atc_test(test_url, "Shelflife")
