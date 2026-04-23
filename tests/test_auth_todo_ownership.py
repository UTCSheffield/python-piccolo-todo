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
