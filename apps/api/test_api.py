import requests
import time

API_URL = "http://127.0.0.1:8000/api/v1"

def test_api():
    print("Testing /health...")
    try:
        res = requests.get("http://127.0.0.1:8000/health")
        print("Health Check:", res.json())
    except Exception as e:
        print("Health check failed:", e)
        return
        
    print("\nTesting /ingest...")
    # 1. Provide a dummy doc_id
    doc_id = "00000000-0000-0000-0000-000000000000"
    
    # But wait, does 00000000-0000-0000-0000-000000000000 exist in knowledge_docs? 
    # foreign key constraint will fail if doc_id is not in knowledge_docs table.
    pass

if __name__ == "__main__":
    test_api()
