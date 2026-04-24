# Deployment on Render (Piccolo + FastAPI)

This guide covers deploying the backend API and admin for this project on Render.

## What Gets Deployed

- FastAPI app from `app.py`
- Piccolo Admin at `/admin`
- API docs at `/docs`

The Expo frontend is deployed separately (or run locally).

## Prerequisites

1. Code pushed to GitHub.
2. Render account: https://render.com
3. `render.yaml` in the repository root.

## Step 1: Verify App Runs Locally

From the project root:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Check:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/admin`

## Step 2: Create a Render Blueprint

1. Open https://dashboard.render.com
2. Click `New +` -> `Blueprint`
3. Connect your GitHub repo
4. Select this project and apply the detected `render.yaml`

Render will create and deploy the web service automatically.

## Step 3: Environment Variables

This project does not require Auth0 variables.

Optional variables you may set:

- `CORS_ORIGINS`: comma-separated list of allowed origins.
  Example:
  `https://your-frontend.example.com,https://your-codespace-8081.app.github.dev`

`CORS_ORIGINS` can include multiple hosts in a single value.

Formatting rules:

- Include the scheme for each origin (`http://` or `https://`).
- Separate origins with commas.
- Do not include URL paths (use origin only).

Examples:

```text
CORS_ORIGINS=https://your-frontend.onrender.com,https://preview.example.com,http://localhost:8081
```

```text
CORS_ORIGINS=https://my-app.vercel.app
```

Notes:

- Do not manually set `RENDER_EXTERNAL_HOSTNAME`.
- Keep secrets in Render environment settings, not in git.

## Step 4: Start Command

Use a production server command in `render.yaml`, for example:

```yaml
startCommand: python -m gunicorn -k uvicorn.workers.UvicornWorker app:app
```

If your current `render.yaml` already deploys successfully, you can keep it as-is.

## Step 5: Validate Deployment

After deploy completes:

1. Open `https://<your-service>.onrender.com/docs`
2. Open `https://<your-service>.onrender.com/admin`
3. Call `GET /api/health`
4. Test login/register and todo CRUD from the frontend

## Database Notes

### SQLite (default)

- Works for quick demos.
- Not recommended for multi-instance or long-term production growth.

### PostgreSQL (recommended)

Use the migration guide in [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md).

## Continuous Deployment

Render redeploys automatically when you push to your tracked branch.

```bash
git add .
git commit -m "Update deployment"
git push origin main
```

## Troubleshooting

- Build fails: check Render deploy logs.
- Import errors: confirm `requirements.txt` contains all needed packages.
- 502/boot failure: confirm start command imports `app:app` successfully.
- CORS failures: set `CORS_ORIGINS` to include your frontend host.
- Slow first request on free tier: service may be waking from sleep.

## Useful Links

- Render Blueprints: https://render.com/docs/infrastructure-as-code
- Render Python services: https://render.com/docs/web-services
- Render environment variables: https://render.com/docs/environment-variables
