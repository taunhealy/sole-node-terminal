import sys
import os

# 📂 ROBUST_PATH_INTELLIGENCE: Locate 'monitor' relative to this script
script_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(script_dir)
sys.path.append(os.path.join(root_dir, 'monitor'))

from main import sync_drop_calendar
import logging

logging.basicConfig(level=logging.INFO)
print("📡 STARTING_DROP_SYNC_SCRATCH...")
results = sync_drop_calendar()
print(f"✅ SYNCED_{len(results)}_ITEMS_TO_FIRESTORE.")
for r in results:
    print(f" - [{r['store']}] {r['title']}")

