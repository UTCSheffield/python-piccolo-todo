import { getApiBaseUrl } from "./config";

export type SessionResponse = {
  authenticated: boolean;
  user?: {
    id: number;
    username: string;
    email?: string;
  };
};

export type Todo = {
  id: number;
  task: string;
  done: boolean;
  category: number;
};

export type Category = {
  id: number;
  name: string;
};

const apiBase = getApiBaseUrl();

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${apiBase}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await res.json()) as T;
};

export const checkSession = async (): Promise<SessionResponse> => {
  return request<SessionResponse>("/api/session");
};

export const login = async (username: string, password: string): Promise<void> => {
  await request<{ success: boolean }>("/api/session/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
};

export const logout = async (): Promise<void> => {
  await request<{ success: boolean }>("/api/session/logout", {
    method: "POST",
  });
};

export const getTodos = async (): Promise<Todo[]> => {
  const data = await request<{ rows: Todo[] }>("/api/todos/");
  return data.rows ?? [];
};

export const getCategories = async (): Promise<Category[]> => {
  const data = await request<{ rows: Category[] }>("/api/categories/");
  return data.rows ?? [];
};

export const createTodo = async (task: string, category: number): Promise<void> => {
  await request<unknown>("/api/todos/", {
    method: "POST",
    body: JSON.stringify({ task, category, done: false }),
  });
};

export const updateTodoDone = async (todo: Todo, done: boolean): Promise<void> => {
  await request<unknown>(`/api/todos/${todo.id}/`, {
    method: "PUT",
    body: JSON.stringify({
      task: todo.task,
      category: todo.category,
      done,
    }),
  });
};

export const deleteTodo = async (id: number): Promise<void> => {
  await request<unknown>(`/api/todos/${id}/`, {
    method: "DELETE",
  });
};