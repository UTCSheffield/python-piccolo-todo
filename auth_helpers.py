from typing import Optional

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from piccolo.apps.user.tables import BaseUser
from piccolo_api.session_auth.tables import SessionsBase
from starlette.status import HTTP_401_UNAUTHORIZED


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class RegisterRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    email: Optional[str] = None


async def get_authenticated_user(request: Request):
    session_token = request.cookies.get("id")
    if not session_token:
        return None

    session = (
        await SessionsBase.objects()
        .where(SessionsBase.token == session_token)
        .first()
    )
    if not session:
        return None

    return await BaseUser.objects().where(BaseUser.id == session.user_id).first()


def user_payload(user: BaseUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_admin": user.admin,
        "is_superuser": user.superuser,
        "is_active": user.active,
    }


async def require_authenticated_user(request: Request) -> BaseUser:
    user = await get_authenticated_user(request)
    if not user:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def set_session_cookie(response: JSONResponse, token: str) -> None:
    response.set_cookie(
        key="id",
        value=token,
        httponly=True,
        samesite="lax",
    )


def clear_session_cookie(response: JSONResponse) -> None:
    response.delete_cookie(key="id", samesite="lax")
