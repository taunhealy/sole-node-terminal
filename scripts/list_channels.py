import os
import requests
import sys
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = os.getenv("DISCORD_SERVER_ID")

def list_channels():
    url = f"https://discord.com/api/v10/guilds/{GUILD_ID}/channels"
    headers = {"Authorization": f"Bot {TOKEN}"}
    resp = requests.get(url, headers=headers)
    if resp.status_code == 200:
        for c in resp.json():
            print(f"{c['name']}: {c['id']} (type {c['type']})")
    else:
        print(f"Error: {resp.text}")

if __name__ == "__main__":
    list_channels()
