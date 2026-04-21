from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from piccolo.apps.user.tables import BaseUser
from piccolo_admin.endpoints import create_admin
from piccolo_api.crud.endpoints import PiccoloCRUD
from piccolo_api.fastapi.endpoints import FastAPIWrapper
from piccolo_api.session_auth.tables import SessionsBase

from tables import Category, Todo

app = FastAPI(title="Piccolo Todo API")
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
