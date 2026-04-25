# Piccolo Todo API + Admin

This repository contains a minimal Piccolo ORM + FastAPI project with:

1. Category and Todo entities.
2. Auto-generated JSON API endpoints using piccolo_api.
3. Built-in Piccolo admin mounted with `piccolo_admin` (no custom admin templates needed).

It also includes an Expo frontend in `frontend/`.

## Data Model

The project uses these entities:

1. Category
2. Todo

Todo fields:

1. task
2. user (foreign key to BaseUser)
3. category (foreign key to Category)
4. done

## Tech Stack

1. FastAPI
2. Piccolo ORM
3. SQLite (default local database)
4. piccolo_admin
5. piccolo_api
6. Expo (frontend)

## Prerequisites

1. Python 3.10+
2. Node.js 18+ and npm

## Install Dependencies

From the project root:

1. Backend dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

2. Frontend dependencies:

   ```bash
   cd frontend
   npm install
   cd ..
   ```

## Run Locally

### Backend

1. Start the API server from the project root:

   ```bash
   python -m uvicorn app:app --reload
   ```

2. Open in browser:

   - Admin UI: http://127.0.0.1:8000/admin
   - API docs: http://127.0.0.1:8000/docs

### Frontend (Expo)

1. Start Expo:

   ```bash
   cd frontend
   npx expo start --web
   ```

2. Press `w` to open in the browser, or scan the QR code with Expo Go.

## Run Both Together

Use two terminals from the project root:

1. Terminal 1 (backend):

   ```bash
   python -m uvicorn app:app --reload
   ```

2. Terminal 2 (frontend):

   ```bash
   cd frontend
   npx expo start
   ```

If running in Codespaces, ensure ports 8000 (backend) and 8081 (Expo) are forwarded.

## Run Refine Frontend (auth-antd)

The repository also includes a Refine + Ant Design frontend in `auth-antd/`.

1. Start backend API from the project root:

   ```bash
   /home/codespace/.python/current/bin/python -m uvicorn app:app --reload
   ```

2. In a second terminal, start Refine frontend:

   ```bash
   cd auth-antd
   npm install
   npm run dev
   ```

3. Open the local URL shown by Vite (typically `http://localhost:5173`).

Notes:

1. In development, `auth-antd/vite.config.ts` proxies `/api` to `http://localhost:8000`.
2. If backend runs on a different host, set `VITE_API_URL` for production builds.
3. Category management is intentionally kept in `/admin`; user-facing frontends only consume category data.

## API Endpoints

The following endpoint groups are mounted and documented in Swagger:

1. /api/categories/
2. /api/todos/

Each group includes standard CRUD operations from `PiccoloCRUD`, such as list, create, detail, update, and delete.

## Important Files

1. app.py: FastAPI app, auto API wrappers, admin mount.
2. tables.py: Piccolo table definitions.
3. piccolo_conf.py: Piccolo engine configuration.