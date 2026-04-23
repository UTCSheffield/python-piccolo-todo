# Migrating to PostgreSQL (Piccolo + FastAPI)

This guide explains how to move this project from local SQLite to PostgreSQL for deployment on Render.

## Why Migrate to PostgreSQL?

- Reliability: SQLite is file-based and best for local development.
- Concurrency: PostgreSQL handles multiple users and writes better.
- Scalability: Better fit for production workloads.
- Managed backups and persistence on Render.

## Current Project Stack

- FastAPI
- Piccolo ORM
- piccolo_admin
- piccolo_api

This means migration steps are based on Piccolo config (not Flask / SQLAlchemy).

## Step 1: Create a PostgreSQL Database on Render

1. Open the Render dashboard.
2. Create a new PostgreSQL service.
3. Wait for provisioning to complete.
4. Copy the connection values (host, database, user, password, port) from Render.

## Step 2: Update Python Dependencies

Install PostgreSQL support for Piccolo.

In `requirements.txt`, replace:

```txt
piccolo[sqlite]==1.24.2
```

with:

```txt
piccolo[postgres]==1.24.2
```

If you want both local SQLite and hosted PostgreSQL support from one requirements file, use:

```txt
piccolo[sqlite,postgres]==1.24.2
```

Then install:

```bash
python -m pip install -r requirements.txt
```

## Step 3: Update `piccolo_conf.py`

Switch from `SQLiteEngine` to `PostgresEngine` using environment variables.

Example:

```python
import os
from piccolo.engine.postgres import PostgresEngine

DB = PostgresEngine(
    config={
        "host": os.getenv("POSTGRES_HOST", "localhost"),
        "database": os.getenv("POSTGRES_DB", "todo"),
        "user": os.getenv("POSTGRES_USER", "postgres"),
        "password": os.getenv("POSTGRES_PASSWORD", "postgres"),
        "port": int(os.getenv("POSTGRES_PORT", "5432")),
    }
)
```

## Step 4: Update `render.yaml`

Add PostgreSQL env vars to the web service and define a managed database.

Example:

```yaml
services:
  - type: web
    name: piccolo-todo-api
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: python -m gunicorn -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:$PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.12.1
      - key: POSTGRES_HOST
        fromDatabase:
          name: todo-db
          property: host
      - key: POSTGRES_DB
        fromDatabase:
          name: todo-db
          property: database
      - key: POSTGRES_USER
        fromDatabase:
          name: todo-db
          property: user
      - key: POSTGRES_PASSWORD
        fromDatabase:
          name: todo-db
          property: password
      - key: POSTGRES_PORT
        fromDatabase:
          name: todo-db
          property: port

databases:
  - name: todo-db
    databaseName: todo
    plan: free
```

## Step 5: Deploy

1. Commit your changes:

```bash
git add requirements.txt piccolo_conf.py render.yaml
git commit -m "Switch Piccolo to PostgreSQL on Render"
git push origin main
```

2. Wait for Render to redeploy.

## Step 6: Verify

1. Open your app and create a todo.
2. Refresh and confirm data persists.
3. Open Admin and confirm rows are present.
4. Check Render database metrics for activity.

## Troubleshooting

### Connection errors

- Verify all `POSTGRES_*` environment variables are set.
- Ensure `POSTGRES_PORT` is numeric.
- Confirm the web service and database are in the same region.

### Import / driver errors

- Ensure `piccolo[postgres]` (or `piccolo[sqlite,postgres]`) is installed.

### Missing tables

- This project creates tables in `app.py` startup.
- Check deploy logs for startup exceptions.

## Rollback to SQLite

1. Revert `piccolo_conf.py` to `SQLiteEngine`.
2. Change requirements back to `piccolo[sqlite]`.
3. Redeploy.

## Useful Links

- Render PostgreSQL docs: https://render.com/docs/databases
- Piccolo Postgres engine docs: https://piccolo-orm.readthedocs.io/en/latest/piccolo/engines/postgres_engine.html
