from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Smart Barangay AI Backend",
    description="FastAPI service for the RAG-enabled chatbot",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with actual Next.js frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import rag_router

app.include_router(rag_router.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"status": "ok", "message": "Smart Barangay AI Backend is running."}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
