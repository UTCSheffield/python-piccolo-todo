# Piccolo Todo API + Admin

This repository contains a minimal Piccolo ORM + FastAPI project with:

1. Category and Todo entities.
2. Auto-generated JSON API endpoints using piccolo_api.
3. Built-in Piccolo admin mounted with `piccolo_admin` (no custom admin templates needed).

## Data Model

The project uses these entities:

1. Category
2. Todo

Todo fields:

1. task
2. user_id
3. category (foreign key to Category)
4. done

## Tech Stack

1. FastAPI
2. Piccolo ORM
3. SQLite (default local database)
4. piccolo_admin
5. piccolo_api

## Run Locally

### Backend

1. Install dependencies:

   python3 -m pip install -r requirements.txt

2. Start the app:

   python3 -m uvicorn app:app --reload

3. Open in browser:

   - Admin UI: http://127.0.0.1:8000/admin
   - API docs: http://127.0.0.1:8000/docs

### Frontend (Expo)

1. Install dependencies:

   cd frontend
   npm install

2. Start Expo:

   npx expo start

3. Press `w` to open in the browser, or scan the QR code with the Expo Go app.

## API Endpoints

The following endpoint groups are mounted and documented in Swagger:

1. /api/categories/
2. /api/todos/

Each group includes standard CRUD operations from `PiccoloCRUD`, such as list, create, detail, update, and delete.

## Important Files

1. app.py: FastAPI app, auto API wrappers, admin mount.
2. tables.py: Piccolo table definitions.
3. piccolo_conf.py: Piccolo engine configuration.