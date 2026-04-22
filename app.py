import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from piccolo.apps.user.tables import BaseUser
from piccolo_admin.endpoints import create_admin
from piccolo_api.crud.endpoints import PiccoloCRUD
from piccolo_api.fastapi.endpoints import FastAPIWrapper
from piccolo_api.session_auth.tables import SessionsBase

from tables import Category, Todo


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


app = FastAPI(title="Piccolo Todo API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_origin_regex=r"https://.*\.app\.github\.dev(:\d+)?",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/admin",
    create_admin(
        tables=[Category, Todo],
        allowed_hosts=["reimagined-dollop-x4vpx6g6j4f99pq-8000.app.github.dev", "localhost"],
    ),
    name="admin",
)


@app.get("/")
async def root():
    return {"message": "Piccolo Todo API", "docs": "/docs", "admin": "/admin/"}


@app.get("/api/health")
async def health():
    return {"status": "ok"}


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
    piccolo_crud=PiccoloCRUD(table=Todo, read_only=False),
)


@app.on_event("startup")
async def startup() -> None:
    await BaseUser.create_table(if_not_exists=True)
    await SessionsBase.create_table(if_not_exists=True)
    await Category.create_table(if_not_exists=True)
    await Todo.create_table(if_not_exists=True)

    if not await Category.exists().where(Category.name == "Urgent"):
        await Category(name="Urgent").save()

    if not await Category.exists().where(Category.name == "Non-urgent"):
        await Category(name="Non-urgent").save()
