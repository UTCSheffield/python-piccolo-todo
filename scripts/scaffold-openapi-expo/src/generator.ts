import fs from 'fs';
import path from 'path';
import { EndpointInfo, OpenAPISchema } from './parser.js';

interface ResourceField {
  name: string;
  type: 'string' | 'number' | 'boolean';
  fkResource?: string;
}

interface ResourceDef {
  name: string;
  label: string;
  fields: ResourceField[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  ownerField?: string;
}

let _components: Record<string, Record<string, unknown>> = {};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function singular(label: string): string {
  return label.endsWith('ies') ? `${label.slice(0, -3)}y` : label.endsWith('s') ? label.slice(0, -1) : label;
}

function pluralizeTable(name: string): string {
  return name.endsWith('y') ? `${name.slice(0, -1)}ies` : `${name}s`;
}

function resolveRef(schema: Record<string, unknown>): Record<string, unknown> {
  const ref = schema.$ref as string | undefined;
  if (!ref) return schema;
  const name = ref.split('/').pop()!;
  return _components[name] ?? schema;
}

function resolveType(fieldSchema: Record<string, unknown>): string {
  if (fieldSchema.type) return fieldSchema.type as string;
  const anyOf = fieldSchema.anyOf as Record<string, unknown>[] | undefined;
  if (!anyOf) return 'string';
  const nonNull = anyOf.find(x => x.type !== 'null');
  return (nonNull?.type as string) || 'string';
}

function extractResources(
  endpoints: EndpointInfo[],
  components: Record<string, Record<string, unknown>>,
): ResourceDef[] {
  _components = components;

  const skip = new Set([
    '/api/session',
    '/api/session/login',
    '/api/session/register',
    '/api/session/logout',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/health',
  ]);

  const seen = new Map<string, ResourceDef>();

  for (const ep of endpoints) {
    const match = ep.path.match(/^\/api\/([^/{}]+)\/?$/);
    if (!match) continue;
    if (skip.has(ep.path.replace(/\/$/, ''))) continue;

    const name = match[1];
    if (!seen.has(name)) {
      seen.set(name, {
        name,
        label: cap(name),
        fields: [],
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      });
    }

    const res = seen.get(name)!;

    if (ep.method === 'POST') {
      res.canCreate = true;
      let schema = ep.requestBody?.content?.['application/json']?.schema as Record<string, unknown> | undefined;
      if (schema) schema = resolveRef(schema);
      if (!schema?.properties) continue;

      const props = schema.properties as Record<string, Record<string, unknown>>;
      for (const [fieldName, fieldSchema] of Object.entries(props)) {
        if (fieldName === 'id') continue;

        const t = resolveType(fieldSchema);
        const isOwnerField =
          (t === 'integer' || t === 'number') &&
          (fieldName === 'user' || fieldName.endsWith('_user'));

        if (isOwnerField) {
          res.ownerField = fieldName;
          continue;
        }

        const extra = fieldSchema.extra as Record<string, unknown> | undefined;
        const fk = extra?.foreign_key as Record<string, unknown> | undefined;
        const fkTable = fk?.to as string | undefined;

        res.fields.push({
          name: fieldName,
          type: t === 'integer' || t === 'number' ? 'number' : t === 'boolean' ? 'boolean' : 'string',
          fkResource: fkTable ? pluralizeTable(fkTable) : undefined,
        });
      }
    }

    if (ep.method === 'DELETE') res.canDelete = true;
  }

  for (const ep of endpoints) {
    const match = ep.path.match(/^\/api\/([^/{}]+)\/\{[^}]+\}\/?$/);
    if (!match) continue;
    const res = seen.get(match[1]);
    if (!res) continue;
    if (ep.method === 'PUT' || ep.method === 'PATCH') res.canUpdate = true;
    if (ep.method === 'DELETE') res.canDelete = true;
  }

  return Array.from(seen.values()).filter(r => r.canCreate || r.canUpdate || r.canDelete);
}

function tplPackageJson(appName: string): string {
  return JSON.stringify(
    {
      name: appName,
      version: '1.0.0',
      private: true,
      main: 'expo-router/entry',
      scripts: {
        start: 'expo start',
        android: 'expo start --android',
        ios: 'expo start --ios',
        web: 'expo start --web',
        'web:codespaces': 'bash ./scripts/start-web.sh',
      },
      dependencies: {
        '@expo/metro-runtime': '~4.0.1',
        expo: '~52.0.0',
        'expo-asset': '~11.0.1',
        'expo-router': '~4.0.0',
        react: '18.3.1',
        'react-dom': '18.3.1',
        'react-native': '0.76.9',
        'react-native-safe-area-context': '4.12.0',
        'react-native-screens': '~4.4.0',
        'react-native-web': '~0.19.13',
      },
      devDependencies: {
        '@types/react': '~18.3.12',
        typescript: '^5.3.3',
      },
    },
    null,
    2,
  );
}

function tplStartWebScript(): string {
  return `#!/usr/bin/env bash
set -e

# If running in Codespaces and no explicit EXPO_PUBLIC_API_URL is set,
# point Expo web to this workspace's forwarded backend URL.
if [[ -n "$CODESPACE_NAME" && -z "$EXPO_PUBLIC_API_URL" ]]; then
  export EXPO_PUBLIC_API_URL="https://$CODESPACE_NAME-8000.app.github.dev"
fi

echo "EXPO_PUBLIC_API_URL=\${EXPO_PUBLIC_API_URL:-<not set>}"
exec npx expo start --web
`;
}

function tplAppJson(appName: string): string {
  return JSON.stringify(
    {
      expo: {
        name: appName,
        slug: appName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        scheme: appName.toLowerCase().replace(/[^a-z0-9]+/g, ''),
        version: '1.0.0',
        orientation: 'portrait',
        web: { bundler: 'metro' },
        plugins: ['expo-router'],
      },
    },
    null,
    2,
  );
}

function tplBabelConfig(): string {
  return `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['expo-router/babel'],
  };
};
`;
}

function tplTsConfig(): string {
  return JSON.stringify(
    {
      extends: 'expo/tsconfig.base',
      compilerOptions: {
        strict: true,
      },
    },
    null,
    2,
  );
}

function tplGitignore(): string {
  return `node_modules/
.expo/
dist/
.env
`;
}

function tplApiConfig(): string {
  return `export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL || '';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}
`;
}

function tplApiClient(endpoints: EndpointInfo[]): string {
  const hasSession = endpoints.some(e => e.path.includes('/session'));

  return `import { getApiBaseUrl } from './config';

export type SessionResponse = {
  authenticated: boolean;
  user?: { id: number; username: string; email?: string };
};

export type ListResponse<T> = { rows: T[]; count?: number };

const base = getApiBaseUrl();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(\`${'${base}${path}'}\`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || \`${'${res.status}'} ${'${res.statusText}'}\`);
  }

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return undefined as T;

  return res.json() as Promise<T>;
}

${hasSession ? `export const checkSession = () => request<SessionResponse>('/api/session');

export const login = (username: string, password: string) =>
  request<void>('/api/session/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const register = (username: string, password: string, email?: string) =>
  request<void>('/api/session/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, email }),
  });

export const logout = () => request<void>('/api/session/logout', { method: 'POST' });
` : `export const checkSession = () => request<SessionResponse>('/api/session');

export const login = (username: string, password: string) =>
  request<void>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const register = (username: string, password: string, email?: string) =>
  request<void>('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password, email }) });

export const logout = () => request<void>('/api/auth/logout', { method: 'POST' });
`}

export const getItems = <T>(resource: string): Promise<T[]> =>
  request<ListResponse<T>>(\`/api/${'${resource}'}/\`).then(d => d.rows ?? []);

export const getItem = <T>(resource: string, id: number): Promise<T> =>
  request<T>(\`/api/${'${resource}'}/${'${id}'}/\`);

export const createItem = <T>(resource: string, payload: T): Promise<void> =>
  request<void>(\`/api/${'${resource}'}/\`, { method: 'POST', body: JSON.stringify(payload) });

export const updateItem = <T>(resource: string, id: number, payload: T): Promise<void> =>
  request<void>(\`/api/${'${resource}'}/${'${id}'}/\`, { method: 'PUT', body: JSON.stringify(payload) });

export const deleteItem = (resource: string, id: number): Promise<void> =>
  request<void>(\`/api/${'${resource}'}/${'${id}'}/\`, { method: 'DELETE' });
`;
}

function tplRootLayout(): string {
  return `import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  );
}
`;
}

function tplIndex(firstResource: string | undefined): string {
  const target = firstResource ? `/(app)/${firstResource}` : '/(auth)/login';
  return `import { Redirect } from 'expo-router';

export default function IndexScreen() {
  return <Redirect href="${target}" />;
}
`;
}

function tplAuthLayout(): string {
  return `import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="register" options={{ title: 'Register' }} />
    </Stack>
  );
}
`;
}

function tplLogin(firstResource: string | undefined): string {
  const target = firstResource ? `/(app)/${firstResource}` : '/';
  return `import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { checkSession, login } from '../../lib/api/client';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onLogin = async () => {
    setError(null);
    try {
      await login(username, password);
      const s = await checkSession();
      if (s.authenticated) {
        router.replace('${target}');
      } else {
        setError('Login failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Sign In</Text>
        <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Sign in" onPress={onLogin} />
        <Link href="/(auth)/register" style={styles.link}>Need an account? Register</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  error: { color: '#b00020' },
  link: { marginTop: 8, color: '#0a66c2' },
});
`;
}

function tplRegister(firstResource: string | undefined): string {
  const target = firstResource ? `/(app)/${firstResource}` : '/';
  return `import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { checkSession, login, register } from '../../lib/api/client';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onRegister = async () => {
    setError(null);
    try {
      await register(username, password, email || undefined);
      await login(username, password);
      const s = await checkSession();
      if (s.authenticated) {
        router.replace('${target}');
      } else {
        setError('Registration failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Email (optional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Register" onPress={onRegister} />
        <Link href="/(auth)/login" style={styles.link}>Have an account? Sign in</Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  error: { color: '#b00020' },
  link: { marginTop: 8, color: '#0a66c2' },
});
`;
}

function tplAppLayout(): string {
  return `import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
    </Stack>
  );
}
`;
}

function tplAppIndex(firstResource: string | undefined): string {
  const target = firstResource ? `/(app)/${firstResource}` : '/';
  return `import { Redirect } from 'expo-router';

export default function AppIndexScreen() {
  return <Redirect href="${target}" />;
}
`;
}

function renderListScreen(resource: ResourceDef): string {
  const typeName = singular(resource.label);

  const fkStates = [...new Set(resource.fields.filter(f => f.fkResource).map(f => f.fkResource!))]
    .map(r => `  const [${r}Options, set${cap(r)}Options] = useState<Array<Record<string, unknown>>>([]);`)
    .join('\n');

  const fkLoaders = [...new Set(resource.fields.filter(f => f.fkResource).map(f => f.fkResource!))]
    .map(r => `      void getItems<Record<string, unknown>>('${r}').then(set${cap(r)}Options).catch(() => {});`)
    .join('\n');

  const newStates = resource.fields
    .map(f => {
      if (f.type === 'boolean') return `  const [new${cap(f.name)}, setNew${cap(f.name)}] = useState(false);`;
      return `  const [new${cap(f.name)}, setNew${cap(f.name)}] = useState('');`;
    })
    .join('\n');

  const payload = resource.fields
    .map(f => {
      if (f.type === 'number') return `      ${f.name}: Number(new${cap(f.name)}),`;
      return `      ${f.name}: new${cap(f.name)},`;
    })
    .join('\n');

  const resetNew = resource.fields
    .map(f => {
      if (f.type === 'boolean') return `      setNew${cap(f.name)}(false);`;
      return `      setNew${cap(f.name)}('');`;
    })
    .join('\n');

  const formFields = resource.fields
    .map(f => {
      if (f.type === 'boolean') {
        return `        <View style={styles.row}>
          <Text style={styles.label}>${f.name}</Text>
          <Switch value={new${cap(f.name)}} onValueChange={setNew${cap(f.name)}} />
        </View>`;
      }

      if (f.fkResource) {
        return `        <Text style={styles.label}>${f.name}</Text>
        <View style={styles.chips}>
          {${f.fkResource}Options.map(opt => {
            const id = Number(opt.id);
            const selected = new${cap(f.name)} === String(id);
            const label = String(opt.name ?? opt.title ?? opt.label ?? id);
            return (
              <Pressable key={id} onPress={() => setNew${cap(f.name)}(String(id))} style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>`;
      }

      return `        <TextInput
          style={styles.input}
          placeholder="${f.name}"
          value={new${cap(f.name)}}
          onChangeText={setNew${cap(f.name)}}
          ${f.type === 'number' ? "keyboardType=\"numeric\"" : ''}
        />`;
    })
    .join('\n');

  const rowCells = resource.fields
    .map(field => {
      const c = field.name;
      if (field?.type === 'boolean') {
        return `            <Text style={styles.itemText}>${c}: {item["${c}"] ? 'true' : 'false'}</Text>`;
      }
      if (field?.fkResource) {
        return `            <Text style={styles.itemText}>${c}: {String(${field.fkResource}Options.find(o => Number(o.id) === Number(item["${c}"]))?.name ?? item["${c}"] ?? '')}</Text>`;
      }
      return `            <Text style={styles.itemText}>${c}: {String(item["${c}"] ?? '')}</Text>`;
    })
    .join('\n');

  const ownerGuard = resource.ownerField
    ? `(Number(item['${resource.ownerField}']) === Number(session.user?.id))`
    : 'true';

  return `import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { checkSession, createItem, deleteItem, getItems, logout, SessionResponse } from '../../lib/api/client';

export default function ${resource.label}Screen() {
  const [session, setSession] = useState<SessionResponse>({ authenticated: false });
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
${newStates}
${fkStates}

  const load = () =>
    getItems<Record<string, unknown>>('${resource.name}').then(setItems).catch(e => setError(e instanceof Error ? e.message : 'Load failed'));

  useEffect(() => {
    checkSession()
      .then(async s => {
        setSession(s);
        if (!s.authenticated) {
          router.replace('/(auth)/login');
          return;
        }
${fkLoaders}
        await load();
      })
      .catch(() => router.replace('/(auth)/login'));
  }, []);

  const onCreate = async () => {
    setError(null);
    try {
      ${resource.canCreate ? `await createItem('${resource.name}', {
${payload}
      });
${resetNew}
      await load();` : '// create not enabled for this resource'}
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const onDelete = async (id: number) => {
    setError(null);
    try {
      ${resource.canDelete ? `await deleteItem('${resource.name}', id);
      await load();` : '// delete not enabled for this resource'}
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>${resource.label}</Text>
        <View style={styles.topRow}>
          <Text style={styles.signedIn}>Signed in as {session.user?.username ?? 'unknown'}</Text>
          <Button title="Sign out" onPress={onLogout} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        ${resource.canCreate ? `<View style={styles.card}>
${formFields}
          <Button title="Add ${typeName}" onPress={onCreate} />
        </View>` : '<View />'}

        <View style={styles.card}>
          <Text style={styles.subtitle}>Items</Text>
          {items.map((item, i) => (
            <View key={String(item.id ?? i)} style={styles.itemRow}>
${rowCells}
              <View style={styles.actions}>
                ${resource.canUpdate ? `<Link href={'/(app)/edit-${resource.name}/' + String(item.id)} asChild>
                  <Pressable style={styles.actionBtn}><Text style={styles.actionText}>Edit</Text></Pressable>
                </Link>` : ''}
                ${resource.canDelete ? `<Pressable
                  onPress={() => (${ownerGuard}) && onDelete(Number(item.id))}
                  style={[styles.actionBtn, styles.deleteBtn, !(${ownerGuard}) && styles.actionDisabled]}
                >
                  <Text style={styles.actionText}>Delete</Text>
                </Pressable>` : ''}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signedIn: { color: '#555' },
  error: { color: '#b00020' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, gap: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#444' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipSelected: { borderColor: '#0a66c2', backgroundColor: '#e6f1fb' },
  chipText: { color: '#333' },
  chipTextSelected: { color: '#0a66c2', fontWeight: '600' },
  itemRow: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 10, gap: 4 },
  itemText: { color: '#333' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: { backgroundColor: '#0a66c2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtn: { backgroundColor: '#c62828' },
  actionDisabled: { opacity: 0.4 },
  actionText: { color: '#fff', fontWeight: '600' },
});
`;
}

function renderEditScreen(resource: ResourceDef): string {
  const typeName = singular(resource.label);

  const editStates = resource.fields
    .map(f => {
      if (f.type === 'boolean') return `  const [edit${cap(f.name)}, setEdit${cap(f.name)}] = useState(false);`;
      return `  const [edit${cap(f.name)}, setEdit${cap(f.name)}] = useState('');`;
    })
    .join('\n');

  const fkStates = [...new Set(resource.fields.filter(f => f.fkResource).map(f => f.fkResource!))]
    .map(r => `  const [${r}Options, set${cap(r)}Options] = useState<Array<Record<string, unknown>>>([]);`)
    .join('\n');

  const fkLoaders = [...new Set(resource.fields.filter(f => f.fkResource).map(f => f.fkResource!))]
    .map(r => `      void getItems<Record<string, unknown>>('${r}').then(set${cap(r)}Options).catch(() => {});`)
    .join('\n');

  const setLoadedFields = resource.fields
    .map(f => {
      if (f.type === 'boolean') return `      setEdit${cap(f.name)}(Boolean(item.${f.name}));`;
      return `      setEdit${cap(f.name)}(String(item.${f.name} ?? ''));`;
    })
    .join('\n');

  const payload = resource.fields
    .map(f => {
      if (f.type === 'number') return `      ${f.name}: Number(edit${cap(f.name)}),`;
      return `      ${f.name}: edit${cap(f.name)},`;
    })
    .join('\n');

  const formFields = resource.fields
    .map(f => {
      if (f.type === 'boolean') {
        return `        <View style={styles.row}>
          <Text style={styles.label}>${f.name}</Text>
          <Switch value={edit${cap(f.name)}} onValueChange={setEdit${cap(f.name)}} />
        </View>`;
      }
      if (f.fkResource) {
        return `        <Text style={styles.label}>${f.name}</Text>
        <View style={styles.chips}>
          {${f.fkResource}Options.map(opt => {
            const id = Number(opt.id);
            const selected = edit${cap(f.name)} === String(id);
            const label = String(opt.name ?? opt.title ?? opt.label ?? id);
            return (
              <Pressable key={id} onPress={() => setEdit${cap(f.name)}(String(id))} style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>`;
      }
      return `        <TextInput
          style={styles.input}
          placeholder="${f.name}"
          value={edit${cap(f.name)}}
          onChangeText={setEdit${cap(f.name)}}
          ${f.type === 'number' ? "keyboardType=\"numeric\"" : ''}
        />`;
    })
    .join('\n');

  return `import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { checkSession, getItem, getItems, updateItem } from '../../../lib/api/client';

export default function Edit${typeName}Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const [error, setError] = useState<string | null>(null);
${editStates}
${fkStates}

  useEffect(() => {
    checkSession().then(s => {
      if (!s.authenticated) {
        router.replace('/(auth)/login');
        return;
      }
      ${fkLoaders}
      if (!Number.isFinite(itemId)) return;
      void getItem<Record<string, unknown>>('${resource.name}', itemId)
        .then(item => {
${setLoadedFields}
        })
        .catch(e => setError(e instanceof Error ? e.message : 'Load failed'));
    });
  }, [id]);

  const onSave = async () => {
    setError(null);
    try {
      ${resource.canUpdate ? `await updateItem('${resource.name}', itemId, {
${payload}
      });` : '// update not enabled'}
      router.replace('/(app)/${resource.name}');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit ${typeName}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
${formFields}
        <Button title="Save" onPress={onSave} />
        <Pressable onPress={() => router.replace('/(app)/${resource.name}')} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  error: { color: '#b00020' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: '#444' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipSelected: { borderColor: '#0a66c2', backgroundColor: '#e6f1fb' },
  chipText: { color: '#333' },
  chipTextSelected: { color: '#0a66c2', fontWeight: '600' },
  cancelBtn: { marginTop: 4, alignSelf: 'flex-start' },
  cancelText: { color: '#0a66c2', fontWeight: '600' },
});
`;
}

export async function generateExpoApp(
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
  const firstResource = resources[0]?.name;

  write('package.json', tplPackageJson(appName));
  write('app.json', tplAppJson(appName));
  write('babel.config.js', tplBabelConfig());
  write('tsconfig.json', tplTsConfig());
  write('.gitignore', tplGitignore());
  write('.env', 'EXPO_PUBLIC_API_URL=\n');
  write('scripts/start-web.sh', tplStartWebScript());

  write('app/_layout.tsx', tplRootLayout());
  write('app/index.tsx', tplIndex(firstResource));
  write('app/(auth)/_layout.tsx', tplAuthLayout());
  write('app/(auth)/login.tsx', tplLogin(firstResource));
  write('app/(auth)/register.tsx', tplRegister(firstResource));
  write('app/(app)/_layout.tsx', tplAppLayout());
  write('app/(app)/index.tsx', tplAppIndex(firstResource));

  write('lib/api/config.ts', tplApiConfig());
  write('lib/api/client.ts', tplApiClient(schema.endpoints));

  for (const resource of resources) {
    write(`app/(app)/${resource.name}.tsx`, renderListScreen(resource));
    if (resource.canUpdate) {
      write(`app/(app)/edit-${resource.name}/[id].tsx`, renderEditScreen(resource));
    }
  }
}
