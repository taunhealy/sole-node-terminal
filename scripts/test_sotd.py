import os, sys
# Ensure we can import from monitor
sys.path.append(os.path.join(os.getcwd(), 'monitor'))
from main import broadcast_sneaker_of_the_day_automated

print("📡 TRIGGERING_TEST_BROADCAST...")
result = broadcast_sneaker_of_the_day_automated()
if result:
    print(f"✅ SUCCESS: Broadcasted {result.get('product_title')}")
else:
    print("❌ FAILED: No items found or error occurred.")
