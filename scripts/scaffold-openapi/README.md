# scaffold-openapi

Generate a React app from an OpenAPI 3.1 schema URL.

## Install

Install globally from GitHub:

```bash
npm install -g github:EduMake/scaffold-openapi-react
```

Or run directly with `npx`:

```bash
npx github:EduMake/scaffold-openapi-react create http://localhost:8000/openapi.json ./my-new-app --app-name MyNewApp
```

## Usage

```bash
scaffold-openapi create <apiUrl> <outputDir> [--app-name <name>]
```

Example:

```bash
scaffold-openapi create http://localhost:8000/openapi.json ./my-new-app --app-name MyNewApp
```

## Arguments

- `create`: Generate a new React app from an OpenAPI schema.
- `<apiUrl>`: URL to the OpenAPI JSON document.
- `<outputDir>`: Directory where the new app is generated.

## Options

- `--app-name <name>`: App name for generated project metadata. Defaults to `generated-app`.

## Local development

```bash
npm install
npm run build
node dist/index.js create http://localhost:8000/openapi.json ./my-new-app
```
