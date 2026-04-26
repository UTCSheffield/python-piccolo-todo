/**
 * Generator creates a complete React app from parsed OpenAPI schema.
 * All generated code is designed to be edited freely by the developer.
 */

import fs from 'fs';
import path from 'path';
import { OpenAPISchema, EndpointInfo } from './parser.js';

// ─── Schema helpers ────────────────────────────────────────────────────────

let _components: Record<string, Record<string, unknown>> = {};

function resolveRef(schema: Record<string, unknown>): Record<string, unknown> {
  const ref = schema['$ref'] as string | undefined;
  if (!ref) return schema;
  const name = ref.split('/').pop()!;
  return _components[name] ?? schema;
}

/** Return a normalised {type} string from a schema node that may use anyOf. */
function resolveType(fieldSchema: Record<string, unknown>): string {
  if (fieldSchema.type) return fieldSchema.type as string;
  const anyOf = fieldSchema.anyOf as Record<string, unknown>[] | undefined;
  if (anyOf) {
    const nonNull = anyOf.find(x => x.type !== 'null');
    if (nonNull) return nonNull.type as string;
  }
  return 'string';
}

// ─── Template functions ────────────────────────────────────────────────────

function tplPackageJson(appName: string): string {
  return JSON.stringify({
    name: appName,
    version: '1.0.0',
    description: 'Generated React app from OpenAPI schema',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: {
      '@types/react': '^18.2.37',
      '@types/react-dom': '^18.2.15',
      '@vitejs/plugin-react': '^4.2.1',
      typescript: '^5.3.3',
      vite: '^5.0.8',
    },
  }, null, 2);
}

function tplTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'bundler',
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      jsx: 'react-jsx',
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  }, null, 2);
}

function tplTsConfigNode(): string {
  return JSON.stringify({
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
    },
    include: ['vite.config.ts'],
  }, null, 2);
}

function tplViteConfig(): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    strictPort: true,
    port: 5300,
    // Proxy /api requests to your backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
`;
}

function tplIndexHtml(appName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function tplMainTsx(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
}

function tplIndexCss(): string {
  return `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #fafafa;
}
`;
}

function tplApiConfig(): string {
  return `/// <reference types="vite/client" />

/**
 * API configuration.
 * In development, Vite proxies /api requests to the backend.
 * Set VITE_API_URL in .env for production overrides.
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL?.replace(/\\/$/, '') ?? '';
}
`;
}

function tplApiClient(endpoints: EndpointInfo[]): string {
  // Detect session-style auth endpoints
  const hasSession = endpoints.some(e => e.path.includes('/session'));

  return `import { getApiBaseUrl } from './config';

// ─── Types ────────────────────────────────────────────────────────────────

export type SessionResponse = {
  authenticated: boolean;
  user?: { id: number; username: string; email?: string };
};

export type ListResponse<T> = { rows: T[]; count?: number };

// ─── Core request helper ──────────────────────────────────────────────────

const base = getApiBaseUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(\`\${base}\${path}\`, {
    credentials: 'include', // sends session cookies automatically
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || \`\${res.status} \${res.statusText}\`);
  }

  // 204 No Content → return undefined rather than failing to parse
  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Session / Auth ───────────────────────────────────────────────────────
${hasSession ? `
export const checkSession = () =>
  request<SessionResponse>('/api/session');

export const login = (username: string, password: string) =>
  request<void>('/api/session/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const logout = () =>
  request<void>('/api/session/logout', { method: 'POST' });
` : `
// TODO: replace with your auth endpoints
export const checkSession = () =>
  request<SessionResponse>('/api/session');
export const login = (username: string, password: string) =>
  request<void>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const logout = () =>
  request<void>('/api/auth/logout', { method: 'POST' });
`}
// ─── Generic CRUD helpers ─────────────────────────────────────────────────
// These work with any REST resource. Replace with resource-specific
// functions as your app grows.

export const getItems = <T>(resource: string): Promise<T[]> =>
  request<ListResponse<T>>(\`/api/\${resource}/\`).then(d => d.rows ?? []);

export const getItem = <T>(resource: string, id: number): Promise<T> =>
  request<T>(\`/api/\${resource}/\${id}/\`);

export const createItem = <T>(resource: string, payload: T): Promise<void> =>
  request<void>(\`/api/\${resource}/\`, { method: 'POST', body: JSON.stringify(payload) });

export const updateItem = <T>(resource: string, id: number, payload: T): Promise<void> =>
  request<void>(\`/api/\${resource}/\${id}/\`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteItem = (resource: string, id: number): Promise<void> =>
  request<void>(\`/api/\${resource}/\${id}/\`, { method: 'DELETE' });
`;
}

// ─── Resource extraction ──────────────────────────────────────────────────

interface ResourceField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  fkResource?: string; // e.g. "categories" — if set, render as a select dropdown
}

interface ResourceDef {
  name: string;       // e.g. "todos"
  label: string;      // e.g. "Todos"
  fields: ResourceField[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  ownerField?: string; // field name that holds the owning user id, e.g. "user"
}

/**
 * Walk the schema's paths and extract user-facing resources with their
 * POST request body fields (used to render create forms).
 */
function extractResources(endpoints: EndpointInfo[], components: Record<string, Record<string, unknown>>): ResourceDef[] {
  _components = components;
  const SKIP = new Set(['/api/session', '/api/session/login', '/api/session/logout',
                        '/api/auth/login', '/api/auth/logout', '/api/health']);

  // Collect unique collection paths: /api/<resource>/
  const seen = new Map<string, ResourceDef>();

  for (const ep of endpoints) {
    // Must be a collection path under /api/ — ends with trailing /
    const match = ep.path.match(/^\/api\/([^/{}]+)\/?$/);
    if (!match) continue;
    if (SKIP.has(ep.path.replace(/\/$/, ''))) continue;

    const name = match[1];
    if (!seen.has(name)) {
      seen.set(name, {
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        fields: [],
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      });
    }
    const res = seen.get(name)!;

    if (ep.method === 'POST') {
      res.canCreate = true;
      // Extract fields from request body schema
      let rawSchema = ep.requestBody?.content?.['application/json']?.schema as Record<string, unknown> | undefined;
      if (rawSchema) rawSchema = resolveRef(rawSchema);
      if (rawSchema?.properties) {
        const props = rawSchema.properties as Record<string, Record<string, unknown>>;
        for (const [fieldName, fieldSchema] of Object.entries(props)) {
          if (fieldName === 'id') continue; // skip auto-generated id
          const t = resolveType(fieldSchema);
          // Detect ownership: integer field whose name is 'user' or ends with '_user'
          const isOwnerField =
            (t === 'integer' || t === 'number') &&
            (fieldName === 'user' || fieldName.endsWith('_user'));
          if (isOwnerField) {
            res.ownerField = fieldName;
            continue; // don't add to fields — server sets this automatically
          }
          const extra = fieldSchema.extra as Record<string, unknown> | undefined;
          const fk = extra?.foreign_key as Record<string, unknown> | undefined;
          const fkTable = fk?.to as string | undefined;
          // Pluralise table name: category→categories, user→users, etc.
          const fkResource = fkTable
            ? (fkTable.endsWith('y') ? fkTable.slice(0, -1) + 'ies' : fkTable + 's')
            : undefined;
          res.fields.push({
            name: fieldName,
            type: t === 'integer' || t === 'number' ? 'number' : t === 'boolean' ? 'boolean' : 'string',
            fkResource,
          });
        }
      }
    }

    if (ep.method === 'DELETE') res.canDelete = true;
  }

  // Also mark delete available if there's a matching /{id}/ path
  for (const ep of endpoints) {
    const match = ep.path.match(/^\/api\/([^/{}]+)\/\{[^}]+\}\/?$/);
    if (!match) continue;
    const res = seen.get(match[1]);
    if (res && (ep.method === 'PUT' || ep.method === 'PATCH')) res.canUpdate = true;
    if (res && ep.method === 'DELETE') res.canDelete = true;
  }

  // Drop read-only resources (no create, update, or delete) — nothing useful to show
  return Array.from(seen.values()).filter(r => r.canCreate || r.canUpdate || r.canDelete);
}

// ─── Per-resource section generator ──────────────────────────────────────

function renderResourceSection(res: ResourceDef): string {
  const R = res.name; // e.g. "todos"
  const label = res.label; // e.g. "Todos"
  // Singularize: strip trailing 'ies'→'y', 's' → ''
  const TypeName = label.endsWith('ies')
    ? label.slice(0, -3) + 'y'
    : label.endsWith('s')
    ? label.slice(0, -1)
    : label;

  // Build form fields
  const fkResources = [...new Set(res.fields.filter(f => f.fkResource).map(f => f.fkResource!))];
  const fkOptionStates = fkResources.map(r =>
    `  const [${r}Options, set${cap(r)}Options] = useState<{id:number;[k:string]:unknown}[]>([]);`
  ).join('\n');
  const fkOptionLoaders = fkResources.map(r =>
    `  useEffect(() => { if (session.authenticated) getItems<{id:number;[k:string]:unknown}>('${r}').then(set${cap(r)}Options).catch(() => {}); }, [session]);`
  ).join('\n');

  const stateFields = res.fields
    .map(f => {
      if (f.type === 'boolean') return `  const [new${cap(f.name)}, setNew${cap(f.name)}] = useState<boolean>(false);`;
      if (f.type === 'number')  return `  const [new${cap(f.name)}, setNew${cap(f.name)}] = useState<string>('');`;
      return                           `  const [new${cap(f.name)}, setNew${cap(f.name)}] = useState('');`;
    })
    .join('\n');

  const editStateFields = res.fields
    .map(f => {
      if (f.type === 'boolean') return `  const [edit${cap(f.name)}, setEdit${cap(f.name)}] = useState<boolean>(false);`;
      if (f.type === 'number')  return `  const [edit${cap(f.name)}, setEdit${cap(f.name)}] = useState<string>('');`;
      return                           `  const [edit${cap(f.name)}, setEdit${cap(f.name)}] = useState('');`;
    })
    .join('\n');

  const submitPayload = res.fields
    .map(f => {
      if (f.type === 'number')  return `      ${f.name}: Number(new${cap(f.name)}),`;
      if (f.type === 'boolean') return `      ${f.name}: new${cap(f.name)},`;
      return                           `      ${f.name}: new${cap(f.name)},`;
    })
    .join('\n');

  const updatePayload = res.fields
    .map(f => {
      if (f.type === 'number')  return `      ${f.name}: Number(edit${cap(f.name)}),`;
      if (f.type === 'boolean') return `      ${f.name}: edit${cap(f.name)},`;
      return                           `      ${f.name}: edit${cap(f.name)},`;
    })
    .join('\n');

  const resetFields = res.fields
    .map(f => {
      if (f.type === 'boolean') return `      setNew${cap(f.name)}(false);`;
      if (f.type === 'number')  return `      setNew${cap(f.name)}('');`;
      return                           `      setNew${cap(f.name)}('');`;
    })
    .join('\n');

  const formInputs = res.fields
    .map(f => {
      if (f.type === 'boolean') {
        return `              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={new${cap(f.name)}} onChange={e => setNew${cap(f.name)}(e.target.checked)} />
                ${f.name}
              </label>`;
      }
      if (f.fkResource) {
        return `              <select value={new${cap(f.name)}} onChange={e => setNew${cap(f.name)}(e.target.value)} style={inp}>
                <option value="">-- ${f.name} --</option>
                {${f.fkResource}Options.map(opt => (
                  <option key={opt.id} value={String(opt.id)}>{String(opt.name ?? opt.title ?? opt.label ?? opt.id)}</option>
                ))}
              </select>`;
      }
      return `              <input
                type="${f.type === 'number' ? 'number' : 'text'}"
                placeholder="${f.name}"
                value={new${cap(f.name)}}
                onChange={e => setNew${cap(f.name)}(e.target.value)}
                style={inp}
              />`;
    })
    .join('\n');

  const editInputs = res.fields
    .map(f => {
      if (f.type === 'boolean') {
        return `              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={edit${cap(f.name)}} onChange={e => setEdit${cap(f.name)}(e.target.checked)} />
                ${f.name}
              </label>`;
      }
      if (f.fkResource) {
        return `              <select value={edit${cap(f.name)}} onChange={e => setEdit${cap(f.name)}(e.target.value)} style={inp}>
                <option value="">-- ${f.name} --</option>
                {${f.fkResource}Options.map(opt => (
                  <option key={opt.id} value={String(opt.id)}>{String(opt.name ?? opt.title ?? opt.label ?? opt.id)}</option>
                ))}
              </select>`;
      }
      return `              <input
                type="${f.type === 'number' ? 'number' : 'text'}"
                placeholder="${f.name}"
                value={edit${cap(f.name)}}
                onChange={e => setEdit${cap(f.name)}(e.target.value)}
                style={inp}
              />`;
    })
    .join('\n');

  // Build table columns — skip id if boring
  const columns = res.fields.length > 0
    ? ['id', ...res.fields.map(f => f.name)]
    : ['id'];

  const thCells = columns.map(c => `<th align="left" style={th}>${c}</th>`).join('\n                  ');
  const tdCells = columns.map(c => {
    if (c === 'id') return `<td style={td}>{(item as Record<string,unknown>).id as number}</td>`;
    const field = res.fields.find(f => f.name === c);
    if (field?.fkResource) {
      return `<td style={td}>{String(${field.fkResource}Options.find(o => o.id === (item as Record<string,unknown>).${c})?.name ?? ${field.fkResource}Options.find(o => o.id === (item as Record<string,unknown>).${c})?.title ?? (item as Record<string,unknown>).${c} ?? '')}</td>`;
    }
    if (field?.type === 'boolean') {
      return `<td style={td}>{(item as Record<string,unknown>).${c} ? '✓' : '✗'}</td>`;
    }
    return `<td style={td}>{String((item as Record<string,unknown>).${c} ?? '')}</td>`;
  }).join('\n                    ');

  const actionsHeader = (res.canUpdate || res.canDelete) ? '<th />' : '';
  const ownerActionGuardStart = res.ownerField
    ? `{(item as Record<string,unknown>).${res.ownerField} === session.user?.id && (`
    : '';
  const ownerActionGuardEnd = res.ownerField ? `)}` : '';
  const editButton = res.canUpdate
    ? `<button onClick={() => onStartEdit${TypeName}(item as Record<string,unknown>)} style={{ ...btn, backgroundColor: '#faad14', padding: '4px 10px', marginRight: 8 }}>Edit</button>`
    : '';
  const deleteButton = res.canDelete
    ? `<button onClick={() => onDelete${TypeName}((item as Record<string,unknown>).id as number)} style={{ ...btn, backgroundColor: '#ff4d4f', padding: '4px 10px' }}>Delete</button>`
    : '';
  const actionButtons = `<>
${editButton}
${deleteButton}
</>`;
  const actionsCell = (res.canUpdate || res.canDelete)
    ? `<td style={td}>${ownerActionGuardStart}${actionButtons}${ownerActionGuardEnd}</td>`
    : '';

  return `
  // ── ${label} ──────────────────────────────────────────────────────
  const [${R}, set${label}] = useState<Record<string,unknown>[]>([]);
${res.canUpdate ? `  const [editing${TypeName}Id, setEditing${TypeName}Id] = useState<number | null>(null);` : ''}
${fkOptionStates}
${stateFields}
${editStateFields}
${fkOptionLoaders}

  const load${label} = () =>
    getItems<Record<string,unknown>>('${R}').then(set${label}).catch(e => setError(e instanceof Error ? e.message : 'Load failed'));

  useEffect(() => { if (session.authenticated) load${label}(); }, [session]);
${res.canCreate ? `
  const onCreate${TypeName} = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await createItem('${R}', {
${submitPayload}
      });
${resetFields}
      await load${label}();
    } catch (err) { setError(err instanceof Error ? err.message : 'Create failed'); }
  };
` : ''}${res.canDelete ? `
  const onDelete${TypeName} = async (id: number) => {
    setError(null);
    try {
      await deleteItem('${R}', id);
      await load${label}();
    } catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); }
  };
` : ''}${res.canUpdate ? `
  const onStartEdit${TypeName} = (item: Record<string,unknown>) => {
    setEditing${TypeName}Id(item.id as number);
${res.fields.map(f => {
  if (f.type === 'boolean') return `    setEdit${cap(f.name)}(Boolean(item.${f.name}));`;
  return `    setEdit${cap(f.name)}(String(item.${f.name} ?? ''));`;
}).join('\n')}
  };

  const onCancelEdit${TypeName} = () => {
    setEditing${TypeName}Id(null);
  };

  const onSave${TypeName} = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editing${TypeName}Id === null) return;
    setError(null);
    try {
      await updateItem('${R}', editing${TypeName}Id, {
${updatePayload}
      });
      setEditing${TypeName}Id(null);
      await load${label}();
    } catch (err) { setError(err instanceof Error ? err.message : 'Update failed'); }
  };
` : ''}
  const ${R}Section = session.authenticated && (
    <section style={section}>
      <h2 style={{ marginTop: 0 }}>${label}</h2>
${res.canCreate ? `
      <form onSubmit={onCreate${TypeName}} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
${formInputs}
        <button type="submit" style={btn}>Add ${TypeName}</button>
      </form>
` : ''}
${res.canUpdate ? `      {editing${TypeName}Id !== null && (
        <form onSubmit={onSave${TypeName}} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, padding: 12, border: '1px solid #ffe58f', borderRadius: 6, background: '#fffbe6' }}>
${editInputs}
          <button type="submit" style={{ ...btn, backgroundColor: '#52c41a' }}>Save ${TypeName}</button>
          <button type="button" onClick={onCancelEdit${TypeName}} style={{ ...btn, backgroundColor: '#8c8c8c' }}>Cancel</button>
        </form>
      )}
` : ''}
      {${R}.length === 0 ? (
        <p style={{ color: '#999' }}>No ${R} yet.</p>
      ) : (
        <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
                  ${thCells}
                  ${actionsHeader}
            </tr>
          </thead>
          <tbody>
            {${R}.map((item, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                    ${tdCells}
                    ${actionsCell}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── App.tsx template ─────────────────────────────────────────────────────

function tplAppTsx(title: string, resources: ResourceDef[]): string {
  const needsCreate = resources.some(r => r.canCreate);
  const needsUpdate = resources.some(r => r.canUpdate);
  const needsDelete = resources.some(r => r.canDelete);
  const crudImports = resources.length > 0
    ? `import { checkSession, login, logout, SessionResponse, getItems${needsCreate ? ', createItem' : ''}${needsUpdate ? ', updateItem' : ''}${needsDelete ? ', deleteItem' : ''} } from './api/client';`
    : `import { checkSession, login, logout, SessionResponse } from './api/client';`;

  const resourceSections = resources.map(renderResourceSection).join('\n');
  const sectionRefs = resources.map(r => `      {${r.name}Section}`).join('\n');

  return `import { FormEvent, useEffect, useState } from 'react';
${crudImports}

const section: React.CSSProperties = { border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, marginBottom: 16 };
const btn: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 };
const th: React.CSSProperties = { padding: '8px 6px', fontWeight: 600, borderBottom: '2px solid #f0f0f0', textAlign: 'left' };
const td: React.CSSProperties = { padding: '6px', borderBottom: '1px solid #f9f9f9' };

export const App = () => {
  const [session, setSession] = useState<SessionResponse>({ authenticated: false });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
${resourceSections}
  useEffect(() => {
    checkSession()
      .then(setSession)
      .catch(e => setError(e instanceof Error ? e.message : 'Session error'))
      .finally(() => setLoading(false));
  }, []);

  const onLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      setPassword('');
      setSession(await checkSession());
    } catch (err) { setError(err instanceof Error ? err.message : 'Login failed'); }
  };

  const onLogout = async () => {
    setError(null);
    try { await logout(); setSession({ authenticated: false }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Logout failed'); }
  };

  if (loading) return <main style={{ padding: 24 }}>Loading…</main>;

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '24px auto', padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>${title}</h1>

      {error && <div style={{ ...section, borderColor: '#ff4d4f', color: '#a8071a', marginBottom: 16 }}>{error}</div>}

      {!session.authenticated ? (
        <section style={section}>
          <h2>Login</h2>
          <form onSubmit={onLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label>Username<input type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" style={{ ...inp, marginLeft: 8 }} /></label>
            <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={{ ...inp, marginLeft: 8 }} /></label>
            <div><button type="submit" style={btn}>Sign in</button></div>
          </form>
        </section>
      ) : (
        <section style={{ ...section, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0 }}>Signed in as <strong>{session.user?.username ?? 'unknown'}</strong></p>
          <button onClick={onLogout} style={btn}>Sign out</button>
        </section>
      )}

${sectionRefs}
    </main>
  );
};
`;
}

function tplEnv(): string {
  return `# Point at your backend in production.
# In development, Vite proxies /api automatically (see vite.config.ts).
VITE_API_URL=
`;
}

// ─── Main generate function ────────────────────────────────────────────────

export async function generateApp(
  schema: OpenAPISchema,
  outputDir: string,
  appName: string,
  _apiUrl: string,
): Promise<void> {
  const write = (relPath: string, content: string) => {
    const full = path.join(outputDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
    console.log(`  ✓ ${relPath}`);
  };

  const resources = extractResources(schema.endpoints, schema.components);
  if (resources.length > 0) {
    console.log(`  📋 Detected resources: ${resources.map(r => r.name).join(', ')}`);
  }

  write('package.json',        tplPackageJson(appName));
  write('tsconfig.json',       tplTsConfig());
  write('tsconfig.node.json',  tplTsConfigNode());
  write('vite.config.ts',      tplViteConfig());
  write('index.html',          tplIndexHtml(appName));
  write('.gitignore',          'node_modules/\ndist/\n.env\n');
  write('.env',                tplEnv());
  write('src/main.tsx',        tplMainTsx());
  write('src/index.css',       tplIndexCss());
  write('src/App.tsx',         tplAppTsx(schema.title || appName, resources));
  write('src/api/config.ts',   tplApiConfig());
  write('src/api/client.ts',   tplApiClient(schema.endpoints));
}
