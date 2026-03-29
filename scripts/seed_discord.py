import requests
import json
from datetime import datetime

API_URL = "https://solenode-api-uo7hii3fca-bq.a.run.app/api/v1/discord-intel"

mock_intel = [
    {
        "channel": "resellers",
        "author": "SNIPE_GOD",
        "content": "Alert! Shelflife Cape Town just restocked Military Blue 4s in-store. Only sizes 8-11 left. Go now!"
    },
    {
        "channel": "market-intel",
        "author": "KICK_LEAK",
        "content": "Confirmed: Archive is dropping the Yeezy Slide Restock tomorrow at 10 AM local time. Online only."
    },
    {
        "channel": "new-stock-alerts",
        "author": "HIVE_BOT",
        "content": "Price Drop Detected: New Balance 2002R at Jack Lemkus reduced by R500. Margin opportunity detected for resale."
    }
]

def seed():
    print("🚀 Seeding Discord Intel to Cloud...")
    for intel in mock_intel:
        try:
            r = requests.post(API_URL, json=intel)
            if r.status_code == 200:
                print(f"✅ Streamed: {intel['author']} -> {intel['channel']}")
            else:
                print(f"❌ Failed: {r.status_code} - {r.text}")
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    seed()
