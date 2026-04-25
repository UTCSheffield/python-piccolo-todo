from uuid import uuid4
from pathlib import Path
import sys

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def _register(client: TestClient, username: str, password: str = "password123"):
    return client.post(
        "/api/session/register",
        json={"username": username, "password": password},
    )


def _logout(client: TestClient):
    return client.post("/api/session/logout")


def _get_category_id(client: TestClient) -> int:
    response = client.get("/api/categories/")
    assert response.status_code == 200
    payload = response.json()

    if isinstance(payload, dict) and "rows" in payload:
        rows = payload["rows"]
    else:
        rows = payload

    assert rows, "Expected at least one default category"
    return rows[0]["id"]


def test_register_login_state_and_session_endpoint(client: TestClient):
    username = f"it-user-{uuid4().hex[:8]}"

    register_response = _register(client=client, username=username)
    assert register_response.status_code == 201
    assert register_response.json().get("success")

    session_response = client.get("/api/session")
    assert session_response.status_code == 200
    session_payload = session_response.json()
    assert session_payload.get("authenticated")
    assert session_payload["user"]["username"] == username


def test_categories_api_is_read_only(client: TestClient):
    category_id = _get_category_id(client=client)

    create_response = client.post("/api/categories/", json={"name": "Blocked category"})
    assert create_response.status_code == 405

    update_response = client.put(
        f"/api/categories/{category_id}/",
        json={"name": "Still blocked"},
    )
    assert update_response.status_code == 405

    delete_response = client.delete(f"/api/categories/{category_id}/")
    assert delete_response.status_code == 405


def test_todo_endpoints_enforce_owner_isolation(client: TestClient):
    category_id = _get_category_id(client=client)

    owner_username = f"owner-{uuid4().hex[:8]}"
    other_username = f"other-{uuid4().hex[:8]}"

    owner_register = _register(client=client, username=owner_username)
    assert owner_register.status_code == 201

    create_response = client.post(
        "/api/todos/",
        json={"task": "Private owner task", "category": category_id, "done": False},
    )
    assert create_response.status_code == 201
    todo_id = create_response.json()[0]["id"]

    _logout(client=client)

    other_register = _register(client=client, username=other_username)
    assert other_register.status_code == 201

    list_response = client.get("/api/todos/")
    assert list_response.status_code == 200
    rows = list_response.json()["rows"]
    assert not any(row["id"] == todo_id for row in rows)

    get_response = client.get(f"/api/todos/{todo_id}/")
    assert get_response.status_code == 404

    update_response = client.put(
        f"/api/todos/{todo_id}/",
        json={"task": "Attempted unauthorized update"},
    )
    assert update_response.status_code == 404

    delete_response = client.delete(f"/api/todos/{todo_id}/")
    assert delete_response.status_code == 404


def test_app_create_todo_assigns_authenticated_user(client: TestClient):
    category_id = _get_category_id(client=client)

    username = f"app-owner-{uuid4().hex[:8]}"
    register_response = _register(client=client, username=username)
    assert register_response.status_code == 201
    user_id = register_response.json()["user"]["id"]

    create_response = client.post(
        "/app/todos",
        data={"task": "Created from app form", "category": str(category_id)},
        follow_redirects=False,
    )
    assert create_response.status_code == 303

    todos_response = client.get("/api/todos/")
    assert todos_response.status_code == 200
    rows = todos_response.json()["rows"]
    assert any(
        row["task"] == "Created from app form" and row["user"] == user_id
        for row in rows
    )


def test_app_routes_cant_mutate_other_users_todo(client: TestClient):
    category_id = _get_category_id(client=client)

    owner_username = f"app-guard-owner-{uuid4().hex[:8]}"
    other_username = f"app-guard-other-{uuid4().hex[:8]}"

    owner_register = _register(client=client, username=owner_username)
    assert owner_register.status_code == 201

    create_response = client.post(
        "/api/todos/",
        json={"task": "App route protected task", "category": category_id, "done": False},
    )
    assert create_response.status_code == 201
    todo_id = create_response.json()[0]["id"]

    _logout(client=client)

    other_register = _register(client=client, username=other_username)
    assert other_register.status_code == 201

    toggle_response = client.post(
        f"/app/todos/{todo_id}/toggle_done",
        follow_redirects=False,
    )
    assert toggle_response.status_code == 303

    delete_response = client.post(
        f"/app/todos/{todo_id}/delete",
        follow_redirects=False,
    )
    assert delete_response.status_code == 303

    other_visible = client.get(f"/api/todos/{todo_id}/")
    assert other_visible.status_code == 404

    _logout(client=client)
    login_response = client.post(
        "/api/session/login",
        json={"username": owner_username, "password": "password123"},
    )
    assert login_response.status_code == 200

    owner_visible = client.get(f"/api/todos/{todo_id}/")
    assert owner_visible.status_code == 200
    assert owner_visible.json()["done"] is False


def test_htmx_routes_cant_mutate_other_users_todo(client: TestClient):
    category_id = _get_category_id(client=client)

    owner_username = f"htmx-guard-owner-{uuid4().hex[:8]}"
    other_username = f"htmx-guard-other-{uuid4().hex[:8]}"

    owner_register = _register(client=client, username=owner_username)
    assert owner_register.status_code == 201

    create_response = client.post(
        "/api/todos/",
        json={"task": "HTMX route protected task", "category": category_id, "done": False},
    )
    assert create_response.status_code == 201
    todo_id = create_response.json()[0]["id"]

    _logout(client=client)

    other_register = _register(client=client, username=other_username)
    assert other_register.status_code == 201

    toggle_response = client.post(f"/htmx/todos/{todo_id}/toggle_done")
    assert toggle_response.status_code == 200

    delete_response = client.delete(f"/htmx/todos/{todo_id}")
    assert delete_response.status_code == 200

    other_visible = client.get(f"/api/todos/{todo_id}/")
    assert other_visible.status_code == 404

    _logout(client=client)
    login_response = client.post(
        "/api/session/login",
        json={"username": owner_username, "password": "password123"},
    )
    assert login_response.status_code == 200

    owner_visible = client.get(f"/api/todos/{todo_id}/")
    assert owner_visible.status_code == 200
    assert owner_visible.json()["done"] is False


def test_todos_owned_piccolo_crud_scopes_by_user(client: TestClient):
    category_id = _get_category_id(client=client)

    owner_username = f"crud-owner-{uuid4().hex[:8]}"
    other_username = f"crud-other-{uuid4().hex[:8]}"

    owner_register = _register(client=client, username=owner_username)
    assert owner_register.status_code == 201
    owner_id = owner_register.json()["user"]["id"]

    create_response = client.post(
        "/api/todos/",
        json={
            "task": "Piccolo owned task",
            "category": category_id,
            "done": False,
            "user": 999999,
        },
    )
    assert create_response.status_code == 201
    todo_id = create_response.json()[0]["id"]

    owner_get = client.get(f"/api/todos/{todo_id}/")
    assert owner_get.status_code == 200
    assert owner_get.json()["user"] == owner_id

    _logout(client=client)

    other_register = _register(client=client, username=other_username)
    assert other_register.status_code == 201

    other_list = client.get("/api/todos/")
    assert other_list.status_code == 200
    assert not any(row["id"] == todo_id for row in other_list.json()["rows"])

    other_get = client.get(f"/api/todos/{todo_id}/")
    assert other_get.status_code == 404
