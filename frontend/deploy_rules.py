import os
import json
import subprocess
import urllib.request

PROJECT_ID = 'sneaker-stock-alert'
RULES_FILE = 'firestore.rules'

def get_token():
    return subprocess.check_output(['gcloud', 'auth', 'print-access-token'], encoding='utf-8', shell=True).strip()

def deploy():
    token = get_token()
    with open(RULES_FILE, 'r') as f:
        rules_content = f.read()

    # Step 1: Create Ruleset
    url = f'https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/rulesets'
    data = json.dumps({
        'source': {
            'files': [{
                'name': 'firestore.rules',
                'content': rules_content
            }]
        }
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as resp:
            ruleset = json.loads(resp.read().decode('utf-8'))
            ruleset_name = ruleset['name']
            print(f"🚀 Ruleset created: {ruleset_name}")
            
            # Step 2: Release Ruleset
            # The release name for Firestore must be exactly 'cloud.firestore'
            release_url = f'https://firebaserules.googleapis.com/v1/projects/{PROJECT_ID}/releases/cloud.firestore'
            release_data = json.dumps({
                'release': {
                    'rulesetName': ruleset_name
                }
            }).encode('utf-8')
            
            patch_req = urllib.request.Request(release_url, data=release_data, method='PATCH')
            patch_req.add_header('Authorization', f'Bearer {token}')
            patch_req.add_header('Content-Type', 'application/json')
            
            with urllib.request.urlopen(patch_req) as patch_resp:
                print("✅ Firestore Rules successfully released!")
                
    except Exception as e:
        print(f"❌ Deploy failed: {e}")
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))

if __name__ == '__main__':
    deploy()
