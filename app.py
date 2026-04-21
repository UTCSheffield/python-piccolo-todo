from fastapi import FastAPI
from piccolo_admin.endpoints import create_admin
from piccolo_api.crud.endpoints import PiccoloCRUD
from piccolo_api.fastapi.endpoints import FastAPIWrapper

from tables import Category, Todo

app = FastAPI(title="Piccolo Todo API")
app.mount("/admin", create_admin(tables=[Category, Todo]), name="admin")

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
    await Category.create_table(if_not_exists=True)
    await Todo.create_table(if_not_exists=True)

    if not await Category.exists().where(Category.name == "Urgent"):
        await Category(name="Urgent").save()

    if not await Category.exists().where(Category.name == "Non-urgent"):
        await Category(name="Non-urgent").save()
