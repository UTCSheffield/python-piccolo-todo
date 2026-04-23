# GitHub Codespaces Setup

GitHub Codespaces is a flexible cloud-based development environment. Your editor runs in the cloud, allowing you to work from anywhere.

## Creating and Starting a Codespace

### Create a New Codespace

1. **Go to your Repository**
   - Navigate to your **python-flask-todo**

2. **Create a Codespace**
   - Click the green **"Code"** button
   - Select the **"Codespaces"** tab
   - Click **"Create codespace on main"** (or your preferred branch)

3. **Wait for Setup**
   - GitHub will provision your Codespace (this takes 1-2 minutes)
   - VS Code will open in your browser automatically
   - The environment is ready when you see the terminal

### Start an Existing Codespace

If you've created a Codespace before:

1. **Go to Your Codespaces**
   - Visit [https://github.com/codespaces](https://github.com/codespaces)
   - Click on your Codespace name to open it

2. **Or via GitHub**
   - Click the green **"Code"** button on the repository
   - Select the **"Codespaces"** tab
   - Click on an existing Codespace to resume it

## Install Dependencies

```bash
py -m pip install -r requirements.txt
```

## Copy Example Environment File

```bash
# On linux or codespaces
cp .env.example .env
```

## Auth0 Setup (Codespaces & Production)

For Codespaces and Render deployment:

1. **Create an Auth0 Account**
   - Go to [auth0.com](https://auth0.com) and sign up

2. **Create an Application**
   - Dashboard → Applications → Create Application
   - Choose "Regular Web Applications"
   - Name: Flask Todo App

3. **Configure Application Settings**
   - "Allowed Callback URLs": `https://<codespace-url>/callback`
   - "Allowed Logout URLs": `https://<codespace-url>/`
   - "Allowed Web Origins": `https://<codespace-url>`
   - Codespaces URL format: `https://<CODESPACE_NAME>-5000.<GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN>/`
   - Example: `https://shiny-space-pancake-g5w6pqr4v7h2pgx-5000.app.github.dev/callback`

4. **Copy Credentials**
   - Add Auth0 Domain, Client ID, and Client Secret to `.env`

## Running the Application

Start the Flask development server:

```bash
python -m flask run
```

The app will be available at [http://localhost:5000](http://localhost:5000)

## Important: Codespaces Port Configuration

If you're running in **GitHub Codespaces**, you must set the forwarded port to **Public** for Auth0 callbacks to work:

1. Open the **Ports** panel (bottom of VS Code)
2. Right-click the port 5000
3. Select "Port Visibility" → **Public**

Without this, Auth0 cannot reach your callback URL and login will fail.

To set both ports to public automatically for the current codespace, run:

```bash
./scripts/set_codespaces_ports.sh
```
## Using the App

1. Visit [http://localhost:5000](http://localhost:5000)
2. Click "Login" - it will automatically route to Auth0
3. After successful login, manage your todos

## Authentication Resources

- [Flask-Dance Documentation](https://flask-dance.readthedocs.io/)
- [Auth0 Python Quickstart](https://auth0.com/docs/quickstart/webapp/python)
- [Auth0 Dashboard](https://manage.auth0.com/)
