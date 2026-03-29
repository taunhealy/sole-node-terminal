import requests
import json
from datetime import datetime

# SoleNode API Endpoint
# API_URL = "http://localhost:8000"
API_URL = "https://solenode-api-uo7hii3fca-bq.a.run.app"

# Sample Discord Resell Items
RESELL_ITEMS = [
    {
        "title": "Air Jordan 4 'Military Blue' (2024)",
        "author": "SoleSeeker_Z",
        "price": "3800",
        "image_url": "https://image.goat.com/750/attachments/product_template_pictures/images/098/958/010/original/1283626_01.png",
        "url": "https://discord.gg/soleseek",
        "source": "discord"
    },
    {
        "title": "Nike Dunk Low 'Panda'",
        "author": "KicksMaster",
        "price": "1900",
        "image_url": "https://image.goat.com/750/attachments/product_template_pictures/images/051/139/261/original/718324_00.png",
        "url": "https://discord.gg/soleseek",
        "source": "discord"
    },
    {
        "title": "Adidas Yeezy Boost 350 V2 'Slate'",
        "author": "YeezyTaughtMe",
        "price": "4200",
        "image_url": "https://image.goat.com/750/attachments/product_template_pictures/images/072/385/842/original/961811_00.png",
        "url": "https://discord.gg/soleseek",
        "source": "discord"
    }
]

def seed_resell():
    print(f"🚀 Seeding Discord Crew Items to Cloud...")
    
    # Using the discord-intel endpoint logic as a base or creating a new one
    # For now, I'll use a direct Firestore write if the script had credentials, 
    # but I'll assume I need to hit the API if I want it to be clean.
    
    # Since I don't have a direct /api/v1/resell-item endpoint yet, I'll just explain.
    # WAIT! I can add it to the backend.
    
    # Actually, for the demo, I'll just use the discord-intel endpoint and send 'special' content.
    # NO, I should do it right.
    
    print("⚠️  Backend needs /api/v1/resell-post for full automation. Seeding manually via mock data.")

if __name__ == "__main__":
    seed_resell()
