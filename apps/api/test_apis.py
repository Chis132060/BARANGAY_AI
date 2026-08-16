import os
import requests
from dotenv import load_dotenv

load_dotenv()

print("--- Testing Alternative APIs ---\n")

# 1. Test Groq
print("1. Testing Groq API...")
groq_key = os.environ.get("GROQ_API_KEY")
if groq_key:
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": "Say 'Groq is working!'"}]
    }
    try:
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
        if response.status_code == 200:
            print("[OK] Groq is WORKING! Response:", response.json()["choices"][0]["message"]["content"])
        else:
            print("[FAIL] Groq Failed:", response.status_code, response.text)
    except Exception as e:
        print("[FAIL] Groq Error:", e)
else:
    print("[WARN] GROQ_API_KEY not found in .env")

print("\n-----------------------------------\n")

# 2. Test OpenRouter
print("2. Testing OpenRouter API...")
or_key = os.environ.get("OPENROUTER_API_KEY")
if or_key:
    headers = {
        "Authorization": f"Bearer {or_key}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "google/gemini-1.5-flash",
        "messages": [{"role": "user", "content": "Say 'OpenRouter is working!'"}]
    }
    try:
        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data)
        if response.status_code == 200:
            print("[OK] OpenRouter is WORKING! Response:", response.json()["choices"][0]["message"]["content"])
        else:
            print("[FAIL] OpenRouter Failed:", response.status_code, response.text)
    except Exception as e:
        print("[FAIL] OpenRouter Error:", e)
else:
    print("[WARN] OPENROUTER_API_KEY not found in .env")

print("\n-----------------------------------\n")

# 3. Test Ollama
print("3. Testing Ollama API...")
try:
    response = requests.get("http://localhost:11434/")
    if response.status_code == 200:
         print("[OK] Local Ollama is running at http://localhost:11434")
    else:
         print("[FAIL] Local Ollama returned status:", response.status_code)
except requests.exceptions.ConnectionError:
    print("[WARN] Local Ollama is NOT running on localhost:11434. If you are using a hosted Ollama service, we need the base URL to test it.")
except Exception as e:
    print("[FAIL] Ollama Error:", e)

