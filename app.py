import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from piccolo.apps.user.tables import BaseUser
from piccolo_admin.endpoints import create_admin
from piccolo_api.crud.endpoints import PiccoloCRUD
from piccolo_api.fastapi.endpoints import FastAPIWrapper
from piccolo_api.session_auth.tables import SessionsBase
from starlette.status import HTTP_201_CREATED, HTTP_401_UNAUTHORIZED, HTTP_404_NOT_FOUND

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


async def _get_authenticated_user(request: Request):
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


def _user_payload(user: BaseUser) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_admin": user.admin,
        "is_superuser": user.superuser,
        "is_active": user.active,
    }


def _todo_payload(todo_row: dict) -> dict:
    return {
        "id": todo_row["id"],
        "task": todo_row["task"],
        "user": todo_row["user"],
        "category": todo_row["category"],
        "done": todo_row["done"],
    }


async def _require_authenticated_user(request: Request) -> BaseUser:
    user = await _get_authenticated_user(request)
    if not user:
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


async def _fetch_owned_todo_or_404(todo_id: int, user: BaseUser):
    todo_row = (
        await Todo.select(Todo.id, Todo.task, Todo.user, Todo.category, Todo.done)
        .where((Todo.id == todo_id) & (Todo.user == user.id))
        .first()
    )
    if not todo_row:
        raise HTTPException(status_code=HTTP_404_NOT_FOUND, detail="Todo not found")
    return todo_row


class CreateTodoRequest(BaseModel):
    task: str = Field(min_length=1, max_length=200)
    category: int
    done: bool = False


class UpdateTodoRequest(BaseModel):
    task: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[int] = None
    done: Optional[bool] = None


@app.get("/api/session")
async def session_status(request: Request):
    user = await _get_authenticated_user(request)
    if not user:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "user": _user_payload(user),
    }


@app.post("/api/session/login")
async def session_login(request: Request):
    payload = await request.json()
    username = payload.get("username", "")
    password = payload.get("password", "")

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
            "user": _user_payload(user),
        }
    )
    response.set_cookie(
        key="id",
        value=session.token,
        httponly=True,
        samesite="lax",
    )
    return response


@app.post("/api/session/register", status_code=HTTP_201_CREATED)
async def session_register(request: Request):
    payload = await request.json()
    username = payload.get("username", "")
    password = payload.get("password", "")
    email = payload.get("email")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

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
            "user": _user_payload(user),
        },
        status_code=HTTP_201_CREATED,
    )
    response.set_cookie(
        key="id",
        value=session.token,
        httponly=True,
        samesite="lax",
    )
    return response


@app.post("/api/session/logout")
async def session_logout(request: Request):
    session_token = request.cookies.get("id")
    if session_token:
        await SessionsBase.remove_session(token=session_token)

    response = JSONResponse({"success": True, "authenticated": False})
    response.delete_cookie(key="id", samesite="lax")
    return response


@app.get("/api/todos/")
async def list_todos(request: Request):
    user = await _require_authenticated_user(request)
    rows = (
        await Todo.select(Todo.id, Todo.task, Todo.user, Todo.category, Todo.done)
        .where(Todo.user == user.id)
    )
    payload_rows = [_todo_payload(row) for row in rows]
    return {"rows": payload_rows, "total": len(payload_rows)}


@app.get("/api/todos/{todo_id}")
async def get_todo(todo_id: int, request: Request):
    user = await _require_authenticated_user(request)
    todo_row = await _fetch_owned_todo_or_404(todo_id=todo_id, user=user)
    return _todo_payload(todo_row)


@app.post("/api/todos/", status_code=HTTP_201_CREATED)
async def create_todo(payload: CreateTodoRequest, request: Request):
    user = await _require_authenticated_user(request)

    category_exists = await Category.exists().where(Category.id == payload.category)
    if not category_exists:
        raise HTTPException(status_code=400, detail="Invalid category")

    todo = Todo(
        task=payload.task.strip(),
        user=user.id,
        category=payload.category,
        done=payload.done,
    )
    await todo.save()

    todo_row = (
        await Todo.select(Todo.id, Todo.task, Todo.user, Todo.category, Todo.done)
        .where(Todo.id == todo.id)
        .first()
    )
    return _todo_payload(todo_row)


@app.put("/api/todos/{todo_id}")
async def update_todo(todo_id: int, payload: UpdateTodoRequest, request: Request):
    user = await _require_authenticated_user(request)
    await _fetch_owned_todo_or_404(todo_id=todo_id, user=user)

    values = {}
    if payload.task is not None:
        values[Todo.task] = payload.task.strip()
    if payload.done is not None:
        values[Todo.done] = payload.done
    if payload.category is not None:
        category_exists = await Category.exists().where(Category.id == payload.category)
        if not category_exists:
            raise HTTPException(status_code=400, detail="Invalid category")
        values[Todo.category] = payload.category

    if values:
        await Todo.update(values).where((Todo.id == todo_id) & (Todo.user == user.id))

    todo_row = await _fetch_owned_todo_or_404(todo_id=todo_id, user=user)
    return _todo_payload(todo_row)


@app.delete("/api/todos/{todo_id}")
async def delete_todo(todo_id: int, request: Request):
    user = await _require_authenticated_user(request)
    await _fetch_owned_todo_or_404(todo_id=todo_id, user=user)
    await Todo.delete().where((Todo.id == todo_id) & (Todo.user == user.id))
    return {"success": True}


@app.get("/admin", include_in_schema=False)
async def admin_redirect() -> RedirectResponse:
    return RedirectResponse(url="/admin/")

FastAPIWrapper(
    root_url="/api/categories/",
    fastapi_app=app,
    piccolo_crud=PiccoloCRUD(table=Category, read_only=False),
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
