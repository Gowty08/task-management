import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET = os.getenv("JWT_SECRET", "jwt-dev-secret")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/taskflowdb")
