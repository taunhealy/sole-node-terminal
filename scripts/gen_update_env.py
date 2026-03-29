import os
from dotenv import load_dotenv

load_dotenv()
env_vars = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    "DISCORD_TOKEN",
    "DISCORD_CLIENT_ID",
    "DISCORD_SERVER_ID",
    "DISCORD_APPLICATION_ID",
    "NEXT_PUBLIC_GEMINI_API_KEY"
]

update_parts = []
for var in env_vars:
    val = os.getenv(var)
    if val:
        update_parts.append(f"{var}={val}")

cmd = f"gcloud run services update solenode-api --region africa-south1 --set-env-vars \"{','.join(update_parts)}\" --quiet"
print(cmd)
