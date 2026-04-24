import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  Category,
  SessionResponse,
  Todo,
  checkSession,
  createTodo,
  deleteTodo,
  getCategories,
  getTodos,
  login,
  logout,
  updateTodoDone,
} from "./api/client";

const sectionStyle: React.CSSProperties = {
  border: "1px solid #d9d9d9",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
};

export const App = () => {
  const [session, setSession] = useState<SessionResponse>({ authenticated: false });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newCategory, setNewCategory] = useState<number | "">("");
  const [busyTodoId, setBusyTodoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [String(c.id), c.name]));
  }, [categories]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentSession = await checkSession();
      setSession(currentSession);
      if (currentSession.authenticated) {
        const [todoRows, categoryRows] = await Promise.all([getTodos(), getCategories()]);
        setTodos(todoRows);
        setCategories(categoryRows);
      } else {
        setTodos([]);
        setCategories([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      await login(username, password);
      setPassword("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    }
  };

  const onLogout = async () => {
    setError(null);
    try {
      await logout();
      setSession({ authenticated: false });
      setTodos([]);
      setCategories([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Logout failed");
    }
  };

  const onCreateTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTask.trim() || newCategory === "") {
      return;
    }
    setError(null);
    try {
      await createTodo(newTask.trim(), Number(newCategory));
      setNewTask("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create todo failed");
    }
  };

  const onToggleDone = async (todo: Todo) => {
    setError(null);
    setBusyTodoId(todo.id);
    try {
      await updateTodoDone(todo, !todo.done);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update todo failed");
    } finally {
      setBusyTodoId(null);
    }
  };

  const onDeleteTodo = async (todo: Todo) => {
    setError(null);
    setBusyTodoId(todo.id);
    try {
      await deleteTodo(todo.id);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete todo failed");
    } finally {
      setBusyTodoId(null);
    }
  };

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 860, margin: "24px auto", padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>OpenAPI Low Code Todo</h1>
      <p style={{ color: "#555" }}>
        Minimal task-focused UI. Expand from generated OpenAPI types and this shared API layer.
      </p>

      {error ? (
        <div style={{ ...sectionStyle, borderColor: "#ff4d4f", color: "#a8071a" }}>{error}</div>
      ) : null}

      {!session.authenticated ? (
        <section style={sectionStyle}>
          <h2>Login</h2>
          <form onSubmit={onLogin}>
            <div style={{ marginBottom: 8 }}>
              <label>
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  style={{ marginLeft: 8 }}
                />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ marginLeft: 8 }}
                />
              </label>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Sign in"}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Session</h2>
            <p>
              Signed in as <strong>{session.user?.username ?? "unknown"}</strong>
            </p>
            <button onClick={() => void onLogout()}>Sign out</button>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Create Todo</h2>
            <form onSubmit={onCreateTodo}>
              <input
                placeholder="Task"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                style={{ marginRight: 8 }}
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value === "" ? "" : Number(e.target.value))}
                style={{ marginRight: 8 }}
              >
                <option value="">Pick category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button type="submit">Create</button>
            </form>
          </section>

          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 }}>Todos</h2>
            <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th align="left">ID</th>
                  <th align="left">Task</th>
                  <th align="left">Category</th>
                  <th align="left">Done</th>
                  <th align="left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {todos.map((todo) => (
                  <tr key={todo.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                    <td>{todo.id}</td>
                    <td>{todo.task}</td>
                    <td>{categoryMap.get(String(todo.category)) ?? todo.category}</td>
                    <td>{todo.done ? "Yes" : "No"}</td>
                    <td>
                      <button
                        onClick={() => void onToggleDone(todo)}
                        disabled={busyTodoId === todo.id}
                        style={{ marginRight: 8 }}
                      >
                        {todo.done ? "Mark not done" : "Mark done"}
                      </button>
                      <button
                        onClick={() => void onDeleteTodo(todo)}
                        disabled={busyTodoId === todo.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
};