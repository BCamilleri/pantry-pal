from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import os 
from dotenv import load_dotenv


# JWT utility functions allow persistent login 
# Temp secret key - would be done more properly if this was a real product
load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY')

# HMAC-SHA256 algorithm for encryption
ALGORITHM = "HS256"

# token expiry time (6 hours = 360 mins)
ACCESS_TOKEN_EXPIRE_MINS = 360


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta: 
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINS)
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": "pantry-pal",
        "user_id": to_encode.get("user_id") or data["userId"],
        "userId": to_encode.get("user_id") or data["userId"],
        "role": to_encode.get("role", "").lower(),
        "sub": to_encode.get("sub")
        })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

