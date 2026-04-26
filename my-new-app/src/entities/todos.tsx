import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getItems, getItem, createItem, updateItem, deleteItem } from '../api/client';
import { btn, displayFkLabel, inp, PageProps, section, td, th } from './common';

export const TodosListPage = ({ session, setError }: PageProps) => {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Record<string,unknown>[]>([]);
  const [categoriesOptions, setCategoriesOptions] = useState<{id:number;[k:string]:unknown}[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newDone, setNewDone] = useState<boolean>(false);
  useEffect(() => { if (session.authenticated) getItems<{id:number;[k:string]:unknown}>('categories').then(setCategoriesOptions).catch(() => {}); }, [session]);

  const loadTodos = () =>
    getItems<Record<string,unknown>>('todos').then(setTodos).catch(e => setError(e instanceof Error ? e.message : 'Load failed'));

  useEffect(() => {
    if (session.authenticated) void loadTodos();
  }, [session]);

  const onCreateTodo = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      if (true) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const onDeleteTodo = async (id: number) => {
    setError(null);
    try {
      if (true) {
        await deleteItem('todos', id);
        await loadTodos();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <section style={section}>
      <h2 style={{ marginTop: 0 }}>Todos</h2>
      {true && (
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
      )}
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
                <td style={td}>{displayFkLabel(categoriesOptions, (item as Record<string,unknown>).category)}</td>
                <td style={td}>{(item as Record<string,unknown>).done ? 'true' : 'false'}</td>
                <td style={td}>{(item as Record<string,unknown>).user === session.user?.id && (<>
<button onClick={() => navigate('/todos/edit/' + String((item as Record<string,unknown>).id))} style={{ ...btn, backgroundColor: '#faad14', padding: '4px 10px', marginRight: 8 }}>Edit</button>
<button onClick={() => onDeleteTodo((item as Record<string,unknown>).id as number)} style={{ ...btn, backgroundColor: '#ff4d4f', padding: '4px 10px' }}>Delete</button>
</>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export const TodoEditPage = ({ session, setError }: PageProps) => {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const editId = Number(params.id);
  const [loadedEditId, setLoadedEditId] = useState<number | null>(null);
  const [categoriesOptions, setCategoriesOptions] = useState<{id:number;[k:string]:unknown}[]>([]);
  const [editTask, setEditTask] = useState('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDone, setEditDone] = useState<boolean>(false);
  useEffect(() => { if (session.authenticated) getItems<{id:number;[k:string]:unknown}>('categories').then(setCategoriesOptions).catch(() => {}); }, [session]);

  const loadEdit = async (id: number) => {
    try {
      const item = await getItem<Record<string,unknown>>('todos', id);
      setEditTask(String(item.task ?? ''));
      setEditCategory(String(item.category ?? ''));
      setEditDone(Boolean(item.done));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    }
  };

  useEffect(() => {
    if (session.authenticated && Number.isFinite(editId) && loadedEditId !== editId) {
      void loadEdit(editId);
      setLoadedEditId(editId);
    }
  }, [session, params.id, loadedEditId]);

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      if (true) {
        await updateItem('todos', editId, {
      task: editTask,
      category: Number(editCategory),
      done: editDone,
        });
      }
      navigate('/todos');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const onCancel = () => navigate('/todos');

  if (!true) {
    return <section style={section}><p style={{ color: '#a8071a' }}>Editing is not available for this resource.</p></section>;
  }

  if (!Number.isFinite(editId)) {
    return <section style={section}><p style={{ color: '#a8071a' }}>Invalid id.</p></section>;
  }

  return (
    <section style={section}>
      <h2 style={{ marginTop: 0 }}>Edit Todo</h2>
      <form onSubmit={onSave} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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
        <button type="button" onClick={onCancel} style={{ ...btn, backgroundColor: '#8c8c8c' }}>Cancel</button>
      </form>
    </section>
  );
};
