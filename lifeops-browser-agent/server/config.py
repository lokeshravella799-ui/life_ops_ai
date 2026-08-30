import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load server/.env or root .env
load_dotenv()

class Settings(BaseSettings):
    PORT: int = 8765
    HOST: str = "127.0.0.1"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3.6-27b"
    GROQ_VISION_MODEL: str = "qwen/qwen3.6-27b"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
