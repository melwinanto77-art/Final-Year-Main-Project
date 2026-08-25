"""Sign-in and session endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import create_token, require_user, verify_password
from database import get_db
from errors import ApiError
from models import UserModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)
    # The portal the user is trying to enter; an admin account may still use
    # the client portal, but a client may never enter the admin console.
    portal: str = "client"


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(UserModel).filter(UserModel.email == email).first()

    # One message for both cases, so the response cannot be used to discover
    # which email addresses exist.
    if not user or not verify_password(body.password, user.password_hash):
        raise ApiError(401, "Incorrect email or password.")

    if user.is_active != "yes":
        raise ApiError(403, "This account has been disabled.")

    if body.portal == "admin" and user.role != "admin":
        raise ApiError(403, "This account does not have administrator access.")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return {"token": create_token(user), "user": user.to_json()}


@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    """Confirm a stored token is still valid — used on page load."""
    claims = require_user(request)
    user = db.query(UserModel).filter(UserModel.id == claims["sub"]).first()
    if not user or user.is_active != "yes":
        raise ApiError(401, "Session is no longer valid.")
    return {"user": user.to_json()}
