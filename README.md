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

## Run Refine Frontend

The repository also includes a Refine + Ant Design frontend in `refine/`.

1. Start backend API from the project root:

   ```bash
   /home/codespace/.python/current/bin/python -m uvicorn app:app --reload
   ```

2. In a second terminal, start Refine frontend:

   ```bash
   cd refine
   npm install
   npm run dev
   ```

3. Open the local URL shown by Vite (typically `http://localhost:5170`).

Notes:

1. In development, `refine/vite.config.ts` proxies `/api` to `http://localhost:8000`.
2. If backend runs on a different host, set `VITE_API_URL` for production builds.
3. Category management is intentionally kept in `/admin`; user-facing frontends only consume category data.

## Run OpenAPI Scaffold Frontend

The repository includes an OpenAPI-to-React scaffold tool in `scripts/scaffold-openapi/`.

It generates a standalone React app from your live API schema, including:

1. Login and register UI
2. Per-entity pages under `src/entities/`
3. List and edit routes for editable resources
4. Foreign key dropdowns (for example category selectors)

### Generate and Run

1. Start backend API from the project root:

   ```bash
   python -m uvicorn app:app --reload
   ```

2. Build the scaffold tool:

   ```bash
   cd scripts/scaffold-openapi
   npm install
   npm run build
   cd ../..
   ```

3. Generate an app from the OpenAPI schema:

   ```bash
   node ./scripts/scaffold-openapi/dist/index.js create http://localhost:8000/openapi.json ./my-new-app --app-name "Piccolo Todo"
   ```

4. Install and run the generated app:

   ```bash
   cd my-new-app
   npm install
   npm run dev
   ```

5. Open the Vite URL shown in the terminal (typically `http://localhost:5300`).

### Troubleshooting

If you see an error like `ENOENT: process.cwd failed`, run commands from the repository root before deleting / regenerating `my-new-app`.

Safe pattern:

```bash
cd /workspaces/python-piccolo-todo
rm -rf ./my-new-app
node ./scripts/scaffold-openapi/dist/index.js create http://localhost:8000/openapi.json ./my-new-app --app-name "Piccolo Todo"
```

## Run OpenAPI Scaffold Expo App

The repository also includes an OpenAPI-to-Expo scaffold tool in `scripts/scaffold-openapi-expo/`.

It generates an Expo Router app from your API schema, including:

1. Login and register screens
2. Per-resource list screens
3. Per-resource edit screens (for resources with update endpoints)
4. Field-aware controls (`TextInput`, `Switch`, and simple FK selectors)

### Generate and Run

1. Start backend API from the project root:

   ```bash
   python -m uvicorn app:app --reload
   ```

2. Build the Expo scaffold tool:

   ```bash
   cd scripts/scaffold-openapi-expo
   npm install
   npm run build
   cd ../..
   ```

3. Generate an Expo app from OpenAPI schema:

   ```bash
   node ./scripts/scaffold-openapi-expo/dist/index.js create http://localhost:8000/openapi.json ./my-new-expo-app --app-name "Piccolo Todo Expo"
   ```

4. Install and run the generated Expo app:

   ```bash
   cd my-new-expo-app
   npm install
   npm run web
   ```

   In Codespaces, you can use:

   ```bash
   npm run web:codespaces
   ```

   This auto-sets `EXPO_PUBLIC_API_URL` to your forwarded backend URL when not already set.

Notes:

1. For native devices, set `EXPO_PUBLIC_API_URL` in the generated `.env` file so the app can reach your backend.
2. Session auth is cookie-based in this project; web works best out of the box.

## API Endpoints

The following endpoint groups are mounted and documented in Swagger:

1. /api/categories/
2. /api/todos/

Each group includes standard CRUD operations from `PiccoloCRUD`, such as list, create, detail, update, and delete.

## Important Files

1. app.py: FastAPI app, auto API wrappers, admin mount.
2. tables.py: Piccolo table definitions.
3. piccolo_conf.py: Piccolo engine configuration.