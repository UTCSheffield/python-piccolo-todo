import { FormEvent, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { checkSession, login, logout, SessionResponse, getItems, getItem, createItem, updateItem, deleteItem } from './api/client';

const section: React.CSSProperties = { border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, marginBottom: 16 };
const btn: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 };
const th: React.CSSProperties = { padding: '8px 6px', fontWeight: 600, borderBottom: '2px solid #f0f0f0', textAlign: 'left' };
const td: React.CSSProperties = { padding: '6px', borderBottom: '1px solid #f9f9f9' };

export const App = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionResponse>({ authenticated: false });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Todos ──────────────────────────────────────────────────────
  const [todos, setTodos] = useState<Record<string,unknown>[]>([]);
  const [loadedEditTodoId, setLoadedEditTodoId] = useState<number | null>(null);
  const [categoriesOptions, setCategoriesOptions] = useState<{id:number;[k:string]:unknown}[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newDone, setNewDone] = useState<boolean>(false);
  const [editTask, setEditTask] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDone, setEditDone] = useState<boolean>(false);
  useEffect(() => { if (session.authenticated) getItems<{id:number;[k:string]:unknown}>('categories').then(setCategoriesOptions).catch(() => {}); }, [session]);

  const loadTodos = () =>
    getItems<Record<string,unknown>>('todos').then(setTodos).catch(e => setError(e instanceof Error ? e.message : 'Load failed'));

  const loadEditTodo = async (id: number) => {
    try {
      const item = await getItem<Record<string,unknown>>('todos', id);
      setEditTask(String(item.task ?? ''));
      setEditCategory(String(item.category ?? ''));
      setEditDone(Boolean(item.done));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    }
  };

  useEffect(() => { if (session.authenticated) loadTodos(); }, [session]);

  const onCreateTodo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await createItem('todos', {
      task: newTask,
      category: Number(newCategory),
      done: newDone,
      });
      setNewTask('');
      setNewCategory('');
      setNewDone(false);
      await loadTodos();
    } catch (err) { setError(err instanceof Error ? err.message : 'Create failed'); }
  };

  const onDeleteTodo = async (id: number) => {
    setError(null);
    try {
      await deleteItem('todos', id);
      await loadTodos();
    } catch (err) { setError(err instanceof Error ? err.message : 'Delete failed'); }
  };

  const onStartEditTodo = (item: Record<string,unknown>) => {
    setLoadedEditTodoId(null);
    navigate('/todos/edit/' + String(item.id));
  };

  const onCancelEditTodo = () => {
    setLoadedEditTodoId(null);
    navigate('/todos');
  };

  const onSaveTodo = async (id: number, e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await updateItem('todos', id, {
      task: editTask,
      category: Number(editCategory),
      done: editDone,
      });
      await loadTodos();
      setLoadedEditTodoId(id);
      navigate('/todos');
    } catch (err) { setError(err instanceof Error ? err.message : 'Update failed'); }
  };

  const TodosListRoute = () => session.authenticated && (
    <section style={section}>
      <h2 style={{ marginTop: 0 }}>Todos</h2>

      <form onSubmit={onCreateTodo} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="task"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                style={inp}
              />
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inp}>
                <option value="">-- category --</option>
                {categoriesOptions.map(opt => (
                  <option key={opt.id} value={String(opt.id)}>{String(opt.name ?? opt.title ?? opt.label ?? opt.id)}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={newDone} onChange={e => setNewDone(e.target.checked)} />
                done
              </label>
        <button type="submit" style={btn}>Add Todo</button>
      </form>

      {todos.length === 0 ? (
        <p style={{ color: '#999' }}>No todos yet.</p>
      ) : (
        <table cellPadding={6} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
                  <th align="left" style={th}>id</th>
                  <th align="left" style={th}>task</th>
                  <th align="left" style={th}>category</th>
                  <th align="left" style={th}>done</th>
                  <th />
            </tr>
          </thead>
          <tbody>
            {todos.map((item, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={td}>{(item as Record<string,unknown>).id as number}</td>
                    <td style={td}>{String((item as Record<string,unknown>).task ?? '')}</td>
                    <td style={td}>{String(categoriesOptions.find(o => o.id === (item as Record<string,unknown>).category)?.name ?? categoriesOptions.find(o => o.id === (item as Record<string,unknown>).category)?.title ?? (item as Record<string,unknown>).category ?? '')}</td>
                    <td style={td}>{(item as Record<string,unknown>).done ? '✓' : '✗'}</td>
                    <td style={td}>{(item as Record<string,unknown>).user === session.user?.id && (<>
<button onClick={() => onStartEditTodo(item as Record<string,unknown>)} style={{ ...btn, backgroundColor: '#faad14', padding: '4px 10px', marginRight: 8 }}>Edit</button>
<button onClick={() => onDeleteTodo((item as Record<string,unknown>).id as number)} style={{ ...btn, backgroundColor: '#ff4d4f', padding: '4px 10px' }}>Delete</button>
</>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );

  const TodoEditRoute = () => {
    const params = useParams<{ id: string }>();
    const editId = Number(params.id);

    useEffect(() => {
      if (session.authenticated && Number.isFinite(editId) && loadedEditTodoId !== editId) {
        void loadEditTodo(editId);
        setLoadedEditTodoId(editId);
      }
    }, [session, params.id, loadedEditTodoId]);

    if (!Number.isFinite(editId)) {
      return <section style={section}><p style={{ color: '#a8071a' }}>Invalid id.</p></section>;
    }

    return (
      <section style={section}>
        <h2 style={{ marginTop: 0 }}>Edit Todo</h2>
        <form onSubmit={(e) => onSaveTodo(editId, e)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="task"
                value={editTask}
                onChange={e => setEditTask(e.target.value)}
                style={inp}
              />
              <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={inp}>
                <option value="">-- category --</option>
                {categoriesOptions.map(opt => (
                  <option key={opt.id} value={String(opt.id)}>{String(opt.name ?? opt.title ?? opt.label ?? opt.id)}</option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={editDone} onChange={e => setEditDone(e.target.checked)} />
                done
              </label>
          <button type="submit" style={{ ...btn, backgroundColor: '#52c41a' }}>Save Todo</button>
          <button type="button" onClick={onCancelEditTodo} style={{ ...btn, backgroundColor: '#8c8c8c' }}>Cancel</button>
        </form>
      </section>
    );
  };


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
      <h1 style={{ marginTop: 0 }}>Piccolo Todo API</h1>

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

      {session.authenticated && (
        <Routes>
          <Route path="/" element={<Navigate to="/todos" replace />} />
              <Route path="/todos" element={<TodosListRoute />} />
              <Route path="/todos/edit/:id" element={<TodoEditRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </main>
  );
};
