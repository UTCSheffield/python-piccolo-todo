import { FormEvent, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { checkSession, login, register, logout, SessionResponse } from './api/client';
import { TodosListPage, TodoEditPage } from './entities/todos';

const section: React.CSSProperties = { border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, marginBottom: 16 };
const btn: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 };

export const App = () => {
  const [session, setSession] = useState<SessionResponse>({ authenticated: false });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const onRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await register(username, password);
      await login(username, password);
      setPassword('');
      setSession(await checkSession());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Register failed');
    }
  };

  const onLogout = async () => {
    setError(null);
    try {
      await logout();
      setSession({ authenticated: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  if (loading) return <main style={{ padding: 24 }}>Loading...</main>;

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '24px auto', padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Piccolo Todo API</h1>

      {error && <div style={{ ...section, borderColor: '#ff4d4f', color: '#a8071a', marginBottom: 16 }}>{error}</div>}

      {!session.authenticated ? (
        <section style={section}>
          <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
          <form onSubmit={authMode === 'login' ? onLogin : onRegister} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label>Username<input type="text" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" style={{ ...inp, marginLeft: 8 }} /></label>
            <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={{ ...inp, marginLeft: 8 }} /></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={btn}>{authMode === 'login' ? 'Sign in' : 'Register'}</button>
              <button type="button" style={{ ...btn, backgroundColor: '#8c8c8c' }} onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
                {authMode === 'login' ? 'Need an account?' : 'Have an account?'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section style={{ ...section, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0 }}>Signed in as <strong>{session.user?.username ?? 'unknown'}</strong></p>
          <button onClick={onLogout} style={btn}>Sign out</button>
        </section>
      )}

      {session.authenticated && (
        <Routes>
          <Route path="/" element={<Navigate to="/todos" replace />} />
          <Route path="/todos" element={<TodosListPage session={session} setError={setError} />} />
          <Route path="/todos/edit/:id" element={<TodoEditPage session={session} setError={setError} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </main>
  );
};
