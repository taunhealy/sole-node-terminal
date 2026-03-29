import os
import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import random

# TACTICAL_BRIDGE: DISCORD_FORUM -> SOLE_RESELL_HUB
# This script demonstrates how a Discord Bot would ingest community marketplace posts
# into the Firestore 'resell_items' collection for real-time streaming.

# Setup Firebase (Ensure your GOOGLE_APPLICATION_CREDENTIALS is set)
# If running locally, you might need: cred = credentials.Certificate('path/to/serviceAccount.json')
cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred, {
    'projectId': 'sneaker-stock-alert',
})

db = firestore.client()

# Simulated Discord Forum Posts
# In a real bot, these would come from the discord.py 'on_thread_create' or 'on_message' events.
DEMO_MARKETPLACE_POSTS = [
    {
        "author": "YeezyZilla",
        "title": "WTS: Yeezy Slide 'Azure' - DS",
        "price": 1800,
        "size": "UK 9",
        "image_url": "https://images.stockx.com/360/Adidas-Yeezy-Slide-Azure/Images/Adidas-Yeezy-Slide-Azure/Lv2/img01.jpg?auto=compress&w=480&q=90",
        "discord_link": "https://discord.com/channels/123456789/987654321/100000001",
        "description": "Never worn, straight from Shelflife. Box in mint condition."
    },
    {
        "author": "SoleSurgeon",
        "title": "Air Jordan 1 'Lost and Found'",
        "price": 8500,
        "size": "UK 10",
        "image_url": "https://images.stockx.com/360/Air-Jordan-1-Retro-High-OG-Chicago-Reimagined-Lost-and-Found/Images/Air-Jordan-1-Retro-High-OG-Chicago-Reimagined-Lost-and-Found/Lv2/img01.jpg?auto=compress&w=480&q=90",
        "discord_link": "https://discord.com/channels/123456789/987654321/100000002",
        "description": "Slightly used, 9/10 condition. OG all included."
    },
    {
        "author": "HypeBeast_SA",
        "title": "Nike Dunk Low 'Panda' - RESTOCK STEAL",
        "price": 2200,
        "size": "UK 8",
        "image_url": "https://images.stockx.com/360/Nike-Dunk-Low-Retro-White-Black-2021/Images/Nike-Dunk-Low-Retro-White-Black-2021/Lv2/img01.jpg?auto=compress&w=480&q=90",
        "discord_link": "https://discord.com/channels/123456789/987654321/100000003",
        "description": "Multiple sizes available. Dm for bulk deals."
    }
]

def stream_to_marketplace():
    print("📡 INITIATING_MARKETPLACE_HANDSHAKE...")
    
    for post in DEMO_MARKETPLACE_POSTS:
        # Generate a unique item ID based on author and title
        item_id = f"discord_{post['author']}_{post['title'].replace(' ', '_')}".lower()
        
        item_data = {
            "title": post['title'],
            "name": post['title'],
            "author": post['author'],
            "price": post['price'],
            "size": post['size'],
            "image_url": post['image_url'],
            "url": post['discord_link'],
            "description": post['description'],
            "source": "discord",
            "created_at": firestore.SERVER_TIMESTAMP,
            "status": "available",
            "category": "Peer-to-Peer"
        }
        
        # Upsert into Firestore
        db.collection("resell_items").document(item_id).set(item_data)
        print(f"✅ STREAMED: {post['title']} by @{post['author']} -> resell_items")

    print("\n🎯 MARKETPLACE_SYNC_COMPLETE | FEED_LIVE")

if __name__ == "__main__":
    stream_to_marketplace()
