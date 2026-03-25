import os
import sys
import time
from solenode_gui import SoleNodeApp

# Bypass the GUI and just test the scraping logic
def quick_test():
    print("🚀 SOLE_NODE: Initializing Full Scraper Verification...")
    
    # Initialize the app state
    app = SoleNodeApp()
    app.monitoring = True # Needed to pass internal checks
    
    # Test Archive (The fix for sizes)
    print("\n--- Testing Archive (Enriched Sizes) ---")
    app.scrape_archive()

    # Test Amazon
    print("\n--- Testing Amazon.co.za ---")
    app.scrape_amazon()
    
    # Test Lemkus
    print("\n--- Testing Jack Lemkus ---")
    app.scrape_lemkus()
    
    # Test Shelflife (Silent solve if needed)
    print("\n--- Testing Shelflife ---")
    # Only solve if cookies are missing
    if not app.session_cookies:
        app.solve_cloudflare()
    app.scrape_shelflife()

    print("\n✅ Verification Cycle Complete!")
    print("Check your dashboard at http://localhost:3000 to see the new data.")

if __name__ == "__main__":
    quick_test()
