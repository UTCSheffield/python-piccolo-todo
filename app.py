import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from piccolo.apps.user.tables import BaseUser
from piccolo_admin.endpoints import create_admin
from piccolo_api.crud.endpoints import PiccoloCRUD
from piccolo_api.fastapi.endpoints import FastAPIWrapper
from piccolo_api.session_auth.tables import SessionsBase
from starlette.status import HTTP_201_CREATED, HTTP_401_UNAUTHORIZED

from app_startup import initialize_schema_and_seed
from auth_helpers import (
    LoginRequest,
    RegisterRequest,
    clear_session_cookie,
    get_authenticated_user,
    require_authenticated_user,
    set_session_cookie,
    user_payload,
)
from owned_piccolo_crud import OwnedPiccoloCRUD
from tables import Category, Todo


@asynccontextmanager
async def lifespan(_: FastAPI):
    await initialize_schema_and_seed()
    yield


def _get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "")
    if raw.strip():
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    return [
        "http://localhost:19006",
        "http://127.0.0.1:19006",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


app = FastAPI(title="Piccolo Todo API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_origin_regex=r"https://.*\.app\.github\.dev(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _get_allowed_hosts() -> list[str]:
    hosts = ["localhost"]
    codespace_name = os.getenv("CODESPACE_NAME")
    if codespace_name:
        hosts.append(f"{codespace_name}-8000.app.github.dev")
    return hosts


app.mount(
    "/admin",
    create_admin(
        tables=[Category, Todo],
        allowed_hosts=_get_allowed_hosts(),
    ),
    name="admin",
)


@app.get("/")
async def root():
    return {"message": "Piccolo Todo API", "docs": "/docs", "admin": "/admin/"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/session")
async def session_status(request: Request):
    user = await get_authenticated_user(request)
    if not user:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "user": user_payload(user),
    }


@app.post("/api/session/login")
async def session_login(payload: LoginRequest):
    username = payload.username
    password = payload.password

    user_id = await BaseUser.login(username=username, password=password)
    if not user_id:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    user = await BaseUser.objects().where(BaseUser.id == user_id).first()
    session = await SessionsBase.create_session(user_id=user_id)

    response = JSONResponse(
        {
            "success": True,
            "user": user_payload(user),
        }
    )
    set_session_cookie(response=response, token=session.token)
    return response


@app.post("/api/session/register", status_code=HTTP_201_CREATED)
async def session_register(payload: RegisterRequest):
    username = payload.username
    password = payload.password
    email = payload.email or f"{username}@local.invalid"

    existing_user = await BaseUser.objects().where(BaseUser.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = await BaseUser.create_user(
        username=username,
        password=password,
        email=email,
        active=True,
    )
    session = await SessionsBase.create_session(user_id=user.id)

    response = JSONResponse(
        {
            "success": True,
            "user": user_payload(user),
        },
        status_code=HTTP_201_CREATED,
    )
    set_session_cookie(response=response, token=session.token)
    return response


@app.post("/api/session/logout")
async def session_logout(request: Request):
    session_token = request.cookies.get("id")
    if session_token:
        await SessionsBase.remove_session(token=session_token)

    response = JSONResponse({"success": True, "authenticated": False})
    clear_session_cookie(response)
    return response


@app.get("/admin", include_in_schema=False)
async def admin_redirect() -> RedirectResponse:
    return RedirectResponse(url="/admin/")

FastAPIWrapper(
    root_url="/api/categories/",
    fastapi_app=app,
    piccolo_crud=PiccoloCRUD(table=Category, read_only=False),
)

FastAPIWrapper(
    root_url="/api/todos/",
    fastapi_app=app,
    piccolo_crud=OwnedPiccoloCRUD(
        table=Todo,
        owner_column=Todo.user,
        read_only=False,
    ),
)
