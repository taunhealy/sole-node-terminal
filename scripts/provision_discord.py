import requests
import json
import time
import os
from dotenv import load_dotenv

# SOLE_SEEKERS_HQ: DISCORD_PROVISIONING_PROTOCOL
# This script uses the Discord REST API to automatically build your community infrastructure.

load_dotenv()

def get_or_create_role(bot_token, guild_id, role_name, color, hoist=True):
    """Checks if a role exists by name, otherwise creates it."""
    base_url = "https://discord.com/api/v10"
    headers = {"Authorization": f"Bot {bot_token}", "Content-Type": "application/json"}
    
    resp = requests.get(f"{base_url}/guilds/{guild_id}/roles", headers=headers)
    if resp.status_code == 200:
        for r in resp.json():
            if r['name'] == role_name:
                print(f"📡 ROLE_FOUND_IDENTIFIED: @{role_name}")
                return r['id']
                
    resp = requests.post(f"{base_url}/guilds/{guild_id}/roles", headers=headers, json={"name": role_name, "color": color, "hoist": hoist})
    if resp.status_code in [200, 201]:
        print(f"✅ ROLE_CREATED_INITIALIZED: @{role_name}")
        return resp.json()['id']
    return None

def get_or_create_channel(bot_token, guild_id, name, type, parent_id=None, topic="", overwrites=None):
    """Checks if a channel exists by name/type, otherwise creates it."""
    base_url = "https://discord.com/api/v10"
    headers = {"Authorization": f"Bot {bot_token}", "Content-Type": "application/json"}
    
    resp = requests.get(f"{base_url}/guilds/{guild_id}/channels", headers=headers)
    if resp.status_code == 200:
        for c in resp.json():
            if c['name'] == name and c['type'] == type:
                print(f"📡 CHANNEL_FOUND: #{name}")
                return c['id']

    data = {"name": name, "type": type, "parent_id": parent_id, "topic": topic}
    if overwrites: data["permission_overwrites"] = overwrites
    
    resp = requests.post(f"{base_url}/guilds/{guild_id}/channels", headers=headers, json=data)
    if resp.status_code in [200, 201]:
        print(f"✅ CHANNEL_CREATED: #{name}")
        return resp.json()['id']
    return None

def post_tactical_briefing(bot_token, channel_id):
    """Sends a pinned instructional message to the marketplace explaining the /sell command."""
    base_url = "https://discord.com/api/v10"
    headers = {"Authorization": f"Bot {bot_token}", "Content-Type": "application/json"}
    
    content = (
        "🛰️ **SOLE_SEEK_MARKETPLACE: OPERATIONAL_PROTOCOL**\n\n"
        "To maintain specialized brand quality for the community, manual posting (typing directly in this channel) has been disabled.\n\n"
        "**How to List your Inventory:**\n"
        "1.  **Initialize Command**: Type **`/sell`** in your message bar.\n"
        "2.  **Detailed Input**: Discord will pop up a window for `item`, `size`, `price`, and `condition`.\n"
        "3.  **Real-Time Sync**: Your product will instantly be carded here and broadcasted to the **Web Dashboard Global Ticker**.\n\n"
        "*Authorized MARKSMAN and OVERWATCH operatives only. Cadets may browse and purchase via DM.* 🏹🏛️"
    )
    
    print(f"📡 SENDING_TACTICAL_BRIEFING: #{channel_id}")
    resp = requests.post(f"{base_url}/channels/{channel_id}/messages", headers=headers, json={"content": content})
    if resp.status_code == 200:
        msg_id = resp.json()['id']
        requests.put(f"{base_url}/channels/{channel_id}/pins/{msg_id}", headers=headers)
        print("✅ BRIEFING_PINNED_SUCCESSFULLY")

def provision_server(bot_token, guild_id):
    base_url = f"https://discord.com/api/v10"
    headers = {"Authorization": f"Bot {bot_token}", "Content-Type": "application/json"}

    print(f"📡 INITIATING_TIERED_PROVISIONING to Guild: {guild_id}")

    # 1. Manage Roles
    role_ids = {
        "OVERWATCH": get_or_create_role(bot_token, guild_id, "OVERWATCH", 0xFF0000),
        "MARKSMAN": get_or_create_role(bot_token, guild_id, "MARKSMAN", 0x3498DB),
        "CADET": get_or_create_role(bot_token, guild_id, "CADET", 0x95A5A6)
    }

    # 2. Permissions (Open-Browse Protocol)
    everyone_id = guild_id
    category_overwrites = [
        {"id": everyone_id, "type": 0, "allow": "0", "deny": "1024"}, # Deny Everyone View
        {"id": role_ids["CADET"], "type": 0, "allow": "1024", "deny": "0"}, # Allow Cadet Browse
        {"id": role_ids["MARKSMAN"], "type": 0, "allow": "1024", "deny": "0"},
        {"id": role_ids["OVERWATCH"], "type": 0, "allow": "1024", "deny": "0"} 
    ]

    # 3. Managed Categories/Channels
    categories = ["📡 INTELLIGENCE (AI)", "📦 MARKETPLACE", "🚨 LIVE ALERTS"]
    cat_ids = {}
    for cname in categories:
        cat_ids[cname] = get_or_create_channel(bot_token, guild_id, cname, 4, overwrites=category_overwrites)

    # 4. Managed Channels under categories
    get_or_create_channel(bot_token, guild_id, "trending-intel", 0, parent_id=cat_ids["📡 INTELLIGENCE (AI)"])
    market_id = get_or_create_channel(bot_token, guild_id, "indie-resellers", 15, parent_id=cat_ids["📦 MARKETPLACE"])
    
    # MISSION_CONTROL Alert Channels
    get_or_create_channel(bot_token, guild_id, "live-restocks", 0, parent_id=cat_ids["🚨 LIVE ALERTS"])
    get_or_create_channel(bot_token, guild_id, "new-stock-alerts", 0, parent_id=cat_ids["🚨 LIVE ALERTS"])
    get_or_create_channel(bot_token, guild_id, "market-intel", 0, parent_id=cat_ids["🚨 LIVE ALERTS"])
    get_or_create_channel(bot_token, guild_id, "early-access-intel", 0, parent_id=cat_ids["🚨 LIVE ALERTS"])
    get_or_create_channel(bot_token, guild_id, "resellers-recon", 0, parent_id=cat_ids["🚨 LIVE ALERTS"])
    
    print("\n🎯 PROVISIONING_COMPLETE | SOLE_SEEKERS_HQ_SECURED")
    return role_ids, market_id

def register_commands(bot_token, application_id, guild_id):
    """Registers the /sell slash command with Discord for the specific server."""
    url = f"https://discord.com/api/v10/applications/{application_id}/guilds/{guild_id}/commands"
    headers = {"Authorization": f"Bot {bot_token}", "Content-Type": "application/json"}

    sell_command = {
        "name": "sell",
        "description": "📦 List a product on the SoleSeek marketplace hub.",
        "options": [
            {"name": "item", "description": "The item name (e.g. Jordan 4)", "type": 3, "required": True},
            {"name": "size", "description": "The size (e.g. UK 10)", "type": 3, "required": True},
            {"name": "price", "description": "The price (e.g. R5000)", "type": 3, "required": True},
            {
                "name": "condition", 
                "description": "Item condition", 
                "type": 3, 
                "required": True,
                "choices": [
                    {"name": "DS (Deadstock)", "value": "DS"},
                    {"name": "VNDS (Very Near Deadstock)", "value": "VNDS"},
                    {"name": "Used", "value": "Used"}
                ]
            }
        ]
    }

    print(f"📡 REGISTERING_COMMANDS: /sell")
    resp = requests.post(url, headers=headers, json=sell_command)
    
    if resp.status_code in [200, 201]:
        print("✅ SLASH_COMMAND_REGISTERED_SUCCESSFULLY")
    else:
        print(f"❌ COMMAND_REGISTRATION_FAILED: {resp.text}")

def lockdown_marketplace(bot_token, guild_id, channel_id, role_ids):
    """Disables the 'New Post' button for humans to force /sell command usage."""
    base_url = f"https://discord.com/api/v10"
    headers = {"Authorization": f"Bot {bot_token}", "Content-Type": "application/json"}
    
    everyone_id = guild_id
    # Permission bit for CREATE_FORUM_THREADS is (1 << 37) and SEND_MESSAGES is (1 << 11)
    # We deny them for everyone and authorized roles to ensure only the bot can post.
    overwrites = [
        {"id": everyone_id, "type": 0, "allow": "0", "deny": "137438953472"}, # Deny Create Threads + Send Messages
        {"id": role_ids.get("CADET"), "type": 0, "allow": "1024", "deny": "137438953472"}, # Allow Browse, Deny Create
        {"id": role_ids.get("MARKSMAN"), "type": 0, "allow": "1024", "deny": "137438953472"}, # Allow View, Deny Create
        {"id": role_ids.get("OVERWATCH"), "type": 0, "allow": "1024", "deny": "137438953472"}
    ]
    
    print(f"📡 LOCKING_DOWN_MARKETPLACE_HUB: #{channel_id}")
    resp = requests.put(f"{base_url}/channels/{channel_id}", headers=headers, json={"permission_overwrites": overwrites})
    
    if resp.status_code == 200:
        print("✅ MARKETPLACE_LOCKED_DOWN_SUCCESSFULLY | BOT_COMMANDS_MANDATORY")
    else:
        print(f"❌ LOCKDOWN_FAILED: {resp.text}")

if __name__ == "__main__":
    TOKEN = os.getenv("DISCORD_TOKEN")
    APP_ID = os.getenv("DISCORD_APPLICATION_ID")
    GUILD_ID = os.getenv("DISCORD_SERVER_ID")
    
    if not TOKEN:
        print("⚠️ ACTION_REQUIRED: Please provide your Bot Token in the .env file.")
    else:
        # 1. Build the server structure and get Role IDs
        role_ids, market_id = provision_server(TOKEN, GUILD_ID)
        
        # 2. Lockdown and Post Instructions
        if market_id:
            lockdown_marketplace(TOKEN, GUILD_ID, market_id, role_ids)
            post_tactical_briefing(TOKEN, market_id)
            
        # 3. Register global slash commands
        register_commands(TOKEN, APP_ID, GUILD_ID)
