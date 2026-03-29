import os, requests
from dotenv import load_dotenv
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
GUILD_ID = os.getenv('DISCORD_SERVER_ID')
resp = requests.get(f'https://discord.com/api/v10/guilds/{GUILD_ID}/channels', headers={'Authorization': f'Bot {TOKEN}'})
for c in resp.json():
    if 'sneaker' in c['name'].lower():
        print(f"MATCH: {c['name']} -> {c['id']}")


