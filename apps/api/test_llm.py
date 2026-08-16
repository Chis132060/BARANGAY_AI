import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import ChatGoogleGenerativeAI

async def test():
    key = os.environ.get("GEMINI_API_KEY")
    print("\nTesting ChatGoogleGenerativeAI...")
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=key)
    try:
        res = llm.invoke("Hello, say hi!")
        print(f"Success! Response: {res.content}")
    except Exception as e:
        print(f"Failed: {e}")

asyncio.run(test())
