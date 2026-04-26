# scaffold-openapi-expo

Generate an Expo Router app from an OpenAPI 3.1 schema URL.

## Install

Install globally from GitHub:

```bash
npm install -g github:EduMake/scaffold-openapi-expo
```

Or run directly with `npx`:

```bash
npx github:EduMake/scaffold-openapi-expo create http://localhost:8000/openapi.json ./my-new-expo-app --app-name MyExpoApp
```

## Usage

```bash
scaffold-openapi-expo create <apiUrl> <outputDir> [--app-name <name>]
```

Example:

```bash
scaffold-openapi-expo create http://localhost:8000/openapi.json ./my-new-expo-app --app-name MyExpoApp
```

## Arguments

- `create`: Generate a new Expo app from an OpenAPI schema.
- `<apiUrl>`: URL to the OpenAPI JSON document.
- `<outputDir>`: Directory where the new app is generated.

## Options

- `--app-name <name>`: App name for generated project metadata. Defaults to `generated-expo-app`.

## Local development

```bash
npm install
npm run build
node dist/index.js create http://localhost:8000/openapi.json ./my-new-expo-app
```
