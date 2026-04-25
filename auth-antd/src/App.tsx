import {
  Refine,
  type AuthProvider,
  Authenticated,
} from "@refinedev/core";
import {
  useNotificationProvider,
  ThemedLayout,
  ErrorComponent,
  AuthPage,
  RefineThemes,
} from "@refinedev/antd";
import {
  DashboardOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";

import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router";
import { BrowserRouter, Routes, Route, Outlet } from "react-router";
import { App as AntdApp, ConfigProvider } from "antd";

import "@ant-design/v5-patch-for-react-19";
import "@refinedev/antd/dist/reset.css";

import { TodoList, TodoCreate, TodoEdit, TodoShow } from "./pages/todos";
import { DashboardPage } from "./pages/dashboard";
import { piccoloDataProvider } from "./lib/dataProvider";

// In dev (Codespaces/local) use relative paths so Vite proxy handles routing.
// In production set VITE_API_URL to the backend host (e.g. https://my-api.onrender.com).
const API_URL = import.meta.env.VITE_API_URL ?? "";

const App: React.FC = () => {
  const authProvider: AuthProvider = {
    login: async ({ email, password }) => {
      try {
        const res = await fetch(`${API_URL}/api/session/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: email, password }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          return {
            success: false,
            error: { message: detail?.detail ?? "Login failed", name: "Login error" },
          };
        }
        const data = await res.json();
        localStorage.setItem("user", JSON.stringify(data.user));
        return { success: true, redirectTo: "/" };
      } catch {
        return { success: false, error: { message: "Network error", name: "Login error" } };
      }
    },
    register: async ({ email, password }) => {
      try {
        const res = await fetch(`${API_URL}/api/session/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: email, password }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          return {
            success: false,
            error: { message: detail?.detail ?? "Registration failed", name: "Register error" },
          };
        }
        const data = await res.json();
        localStorage.setItem("user", JSON.stringify(data.user));
        return { success: true, redirectTo: "/" };
      } catch {
        return { success: false, error: { message: "Network error", name: "Register error" } };
      }
    },
    logout: async () => {
      await fetch(`${API_URL}/api/session/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
      localStorage.removeItem("user");
      return { success: true, redirectTo: "/login" };
    },
    check: async () => {
      try {
        const res = await fetch(`${API_URL}/api/session`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.authenticated) {
          localStorage.setItem("user", JSON.stringify(data.user));
          return { authenticated: true };
        }
      } catch {}
      localStorage.removeItem("user");
      return { authenticated: false, redirectTo: "/login", logout: true };
    },
    onError: async (error) => {
      if (error?.response?.status === 401) return { logout: true };
      return { error };
    },
    getIdentity: async () => {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const user = JSON.parse(raw);
      return { id: user.id, name: user.username };
    },
    getPermissions: async () => null,
    forgotPassword: async () => ({ success: true }),
    updatePassword: async () => ({ success: true }),
  };

  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <AntdApp>
          <Refine
            authProvider={authProvider}
            dataProvider={piccoloDataProvider(`${API_URL}/api`)}
            routerProvider={routerProvider}
            resources={[
              {
                name: "dashboard",
                list: "/",
                meta: { label: "Dashboard", icon: <DashboardOutlined /> },
              },
              {
                name: "todos",
                list: "/todos",
                create: "/todos/create",
                edit: "/todos/edit/:id",
                show: "/todos/show/:id",
                meta: { label: "Todos", icon: <CheckSquareOutlined /> },
              },
            ]}
            notificationProvider={useNotificationProvider}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route
                element={
                  <Authenticated
                    key="authenticated-routes"
                    fallback={<CatchAllNavigate to="/login" />}
                  >
                    <ThemedLayout>
                      <Outlet />
                    </ThemedLayout>
                  </Authenticated>
                }
              >
                <Route index element={<DashboardPage />} />

                <Route path="/todos">
                  <Route index element={<TodoList />} />
                  <Route path="create" element={<TodoCreate />} />
                  <Route path="edit/:id" element={<TodoEdit />} />
                  <Route path="show/:id" element={<TodoShow />} />
                </Route>
              </Route>

              <Route
                element={
                  <Authenticated key="auth-pages" fallback={<Outlet />}>
                    <NavigateToResource resource="todos" />
                  </Authenticated>
                }
              >
                <Route
                  path="/login"
                  element={
                    <AuthPage
                      type="login"
                      formProps={{ initialValues: { email: "", password: "" } }}
                    />
                  }
                />
                <Route
                  path="/register"
                  element={<AuthPage type="register" />}
                />
              </Route>

              <Route
                element={
                  <Authenticated key="catch-all">
                    <ThemedLayout>
                      <Outlet />
                    </ThemedLayout>
                  </Authenticated>
                }
              >
                <Route path="*" element={<ErrorComponent />} />
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
