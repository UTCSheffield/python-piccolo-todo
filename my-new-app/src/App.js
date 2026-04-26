import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { checkSession, login, logout, getItems, getItem, createItem, updateItem, deleteItem } from './api/client';
const section = { border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, marginBottom: 16 };
const btn = { padding: '8px 16px', backgroundColor: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
const inp = { padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 };
const th = { padding: '8px 6px', fontWeight: 600, borderBottom: '2px solid #f0f0f0', textAlign: 'left' };
const td = { padding: '6px', borderBottom: '1px solid #f9f9f9' };
export const App = () => {
    const navigate = useNavigate();
    const [session, setSession] = useState({ authenticated: false });
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // ── Todos ──────────────────────────────────────────────────────
    const [todos, setTodos] = useState([]);
    const [loadedEditTodoId, setLoadedEditTodoId] = useState(null);
    const [categoriesOptions, setCategoriesOptions] = useState([]);
    const [newTask, setNewTask] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newDone, setNewDone] = useState(false);
    const [editTask, setEditTask] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editDone, setEditDone] = useState(false);
    useEffect(() => { if (session.authenticated)
        getItems('categories').then(setCategoriesOptions).catch(() => { }); }, [session]);
    const loadTodos = () => getItems('todos').then(setTodos).catch(e => setError(e instanceof Error ? e.message : 'Load failed'));
    const loadEditTodo = async (id) => {
        try {
            const item = await getItem('todos', id);
            setEditTask(String(item.task ?? ''));
            setEditCategory(String(item.category ?? ''));
            setEditDone(Boolean(item.done));
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Load failed');
        }
    };
    useEffect(() => { if (session.authenticated)
        loadTodos(); }, [session]);
    const onCreateTodo = async (e) => {
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
        }
    };
    const onDeleteTodo = async (id) => {
        setError(null);
        try {
            await deleteItem('todos', id);
            await loadTodos();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
        }
    };
    const onStartEditTodo = (item) => {
        setLoadedEditTodoId(null);
        navigate('/todos/edit/' + String(item.id));
    };
    const onCancelEditTodo = () => {
        setLoadedEditTodoId(null);
        navigate('/todos');
    };
    const onSaveTodo = async (id, e) => {
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Update failed');
        }
    };
    const TodosListRoute = () => session.authenticated && (_jsxs("section", { style: section, children: [_jsx("h2", { style: { marginTop: 0 }, children: "Todos" }), _jsxs("form", { onSubmit: onCreateTodo, style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, children: [_jsx("input", { type: "text", placeholder: "task", value: newTask, onChange: e => setNewTask(e.target.value), style: inp }), _jsxs("select", { value: newCategory, onChange: e => setNewCategory(e.target.value), style: inp, children: [_jsx("option", { value: "", children: "-- category --" }), categoriesOptions.map(opt => (_jsx("option", { value: String(opt.id), children: String(opt.name ?? opt.title ?? opt.label ?? opt.id) }, opt.id)))] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("input", { type: "checkbox", checked: newDone, onChange: e => setNewDone(e.target.checked) }), "done"] }), _jsx("button", { type: "submit", style: btn, children: "Add Todo" })] }), todos.length === 0 ? (_jsx("p", { style: { color: '#999' }, children: "No todos yet." })) : (_jsxs("table", { cellPadding: 6, style: { borderCollapse: 'collapse', width: '100%' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { background: '#fafafa' }, children: [_jsx("th", { align: "left", style: th, children: "id" }), _jsx("th", { align: "left", style: th, children: "task" }), _jsx("th", { align: "left", style: th, children: "category" }), _jsx("th", { align: "left", style: th, children: "done" }), _jsx("th", {})] }) }), _jsx("tbody", { children: todos.map((item, i) => (_jsxs("tr", { style: { borderTop: '1px solid #f0f0f0' }, children: [_jsx("td", { style: td, children: item.id }), _jsx("td", { style: td, children: String(item.task ?? '') }), _jsx("td", { style: td, children: String(categoriesOptions.find(o => o.id === item.category)?.name ?? categoriesOptions.find(o => o.id === item.category)?.title ?? item.category ?? '') }), _jsx("td", { style: td, children: item.done ? '✓' : '✗' }), _jsx("td", { style: td, children: item.user === session.user?.id && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => onStartEditTodo(item), style: { ...btn, backgroundColor: '#faad14', padding: '4px 10px', marginRight: 8 }, children: "Edit" }), _jsx("button", { onClick: () => onDeleteTodo(item.id), style: { ...btn, backgroundColor: '#ff4d4f', padding: '4px 10px' }, children: "Delete" })] })) })] }, i))) })] }))] }));
    const TodoEditRoute = () => {
        const params = useParams();
        const editId = Number(params.id);
        useEffect(() => {
            if (session.authenticated && Number.isFinite(editId) && loadedEditTodoId !== editId) {
                void loadEditTodo(editId);
                setLoadedEditTodoId(editId);
            }
        }, [session, params.id, loadedEditTodoId]);
        if (!Number.isFinite(editId)) {
            return _jsx("section", { style: section, children: _jsx("p", { style: { color: '#a8071a' }, children: "Invalid id." }) });
        }
        return (_jsxs("section", { style: section, children: [_jsx("h2", { style: { marginTop: 0 }, children: "Edit Todo" }), _jsxs("form", { onSubmit: (e) => onSaveTodo(editId, e), style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }, children: [_jsx("input", { type: "text", placeholder: "task", value: editTask, onChange: e => setEditTask(e.target.value), style: inp }), _jsxs("select", { value: editCategory, onChange: e => setEditCategory(e.target.value), style: inp, children: [_jsx("option", { value: "", children: "-- category --" }), categoriesOptions.map(opt => (_jsx("option", { value: String(opt.id), children: String(opt.name ?? opt.title ?? opt.label ?? opt.id) }, opt.id)))] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("input", { type: "checkbox", checked: editDone, onChange: e => setEditDone(e.target.checked) }), "done"] }), _jsx("button", { type: "submit", style: { ...btn, backgroundColor: '#52c41a' }, children: "Save Todo" }), _jsx("button", { type: "button", onClick: onCancelEditTodo, style: { ...btn, backgroundColor: '#8c8c8c' }, children: "Cancel" })] })] }));
    };
    useEffect(() => {
        checkSession()
            .then(setSession)
            .catch(e => setError(e instanceof Error ? e.message : 'Session error'))
            .finally(() => setLoading(false));
    }, []);
    const onLogin = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await login(username, password);
            setPassword('');
            setSession(await checkSession());
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        }
    };
    const onLogout = async () => {
        setError(null);
        try {
            await logout();
            setSession({ authenticated: false });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Logout failed');
        }
    };
    if (loading)
        return _jsx("main", { style: { padding: 24 }, children: "Loading\u2026" });
    return (_jsxs("main", { style: { fontFamily: 'sans-serif', maxWidth: 960, margin: '24px auto', padding: 16 }, children: [_jsx("h1", { style: { marginTop: 0 }, children: "Piccolo Todo API" }), error && _jsx("div", { style: { ...section, borderColor: '#ff4d4f', color: '#a8071a', marginBottom: 16 }, children: error }), !session.authenticated ? (_jsxs("section", { style: section, children: [_jsx("h2", { children: "Login" }), _jsxs("form", { onSubmit: onLogin, style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("label", { children: ["Username", _jsx("input", { type: "text", value: username, onChange: e => setUsername(e.target.value), autoComplete: "username", style: { ...inp, marginLeft: 8 } })] }), _jsxs("label", { children: ["Password", _jsx("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), autoComplete: "current-password", style: { ...inp, marginLeft: 8 } })] }), _jsx("div", { children: _jsx("button", { type: "submit", style: btn, children: "Sign in" }) })] })] })) : (_jsxs("section", { style: { ...section, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("p", { style: { margin: 0 }, children: ["Signed in as ", _jsx("strong", { children: session.user?.username ?? 'unknown' })] }), _jsx("button", { onClick: onLogout, style: btn, children: "Sign out" })] })), session.authenticated && (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/todos", replace: true }) }), _jsx(Route, { path: "/todos", element: _jsx(TodosListRoute, {}) }), _jsx(Route, { path: "/todos/edit/:id", element: _jsx(TodoEditRoute, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }))] }));
};
