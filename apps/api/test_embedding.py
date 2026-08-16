import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import GoogleGenerativeAIEmbeddings

async def test():
    key = os.environ.get("GEMINI_API_KEY")
    
    models = ["models/gemini-embedding-001", "models/gemini-embedding-2"]
    for m in models:
        print(f"Testing {m}...")
        try:
            embeddings = GoogleGenerativeAIEmbeddings(model=m, google_api_key=key)
            res = embeddings.embed_query("hello")
            print(f"Success! {m} returned {len(res)} dimensions")
        except Exception as e:
            print(f"Failed {m}: {e}")

asyncio.run(test())
