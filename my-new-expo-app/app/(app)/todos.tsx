import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { checkSession, createItem, deleteItem, getItems, logout, SessionResponse } from '../../lib/api/client';

export default function TodosScreen() {
  const [session, setSession] = useState<SessionResponse>({ authenticated: false });
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDone, setNewDone] = useState(false);
  const [categoriesOptions, setCategoriesOptions] = useState<Array<Record<string, unknown>>>([]);

  const load = () =>
    getItems<Record<string, unknown>>('todos').then(setItems).catch(e => setError(e instanceof Error ? e.message : 'Load failed'));

  useEffect(() => {
    checkSession()
      .then(async s => {
        setSession(s);
        if (!s.authenticated) {
          router.replace('/(auth)/login');
          return;
        }
      void getItems<Record<string, unknown>>('categories').then(setCategoriesOptions).catch(() => {});
        await load();
      })
      .catch(() => router.replace('/(auth)/login'));
  }, []);

  const onCreate = async () => {
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const onDelete = async (id: number) => {
    setError(null);
    try {
      await deleteItem('todos', id);
      await load();
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
        <Text style={styles.title}>Todos</Text>
        <View style={styles.topRow}>
          <Text style={styles.signedIn}>Signed in as {session.user?.username ?? 'unknown'}</Text>
          <Button title="Sign out" onPress={onLogout} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="task"
          value={newTask}
          onChangeText={setNewTask}
          
        />
        <Text style={styles.label}>category</Text>
        <View style={styles.chips}>
          {categoriesOptions.map(opt => {
            const id = Number(opt.id);
            const selected = newCategory === String(id);
            const label = String(opt.name ?? opt.title ?? opt.label ?? id);
            return (
              <Pressable key={id} onPress={() => setNewCategory(String(id))} style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>done</Text>
          <Switch value={newDone} onValueChange={setNewDone} />
        </View>
          <Button title="Add Todo" onPress={onCreate} />
        </View>

        <View style={styles.card}>
          <Text style={styles.subtitle}>Items</Text>
          {items.map((item, i) => (
            <View key={String(item.id ?? i)} style={styles.itemRow}>
            <Text style={styles.itemText}>task: {String(item["task"] ?? '')}</Text>
            <Text style={styles.itemText}>category: {String(categoriesOptions.find(o => Number(o.id) === Number(item["category"]))?.name ?? item["category"] ?? '')}</Text>
            <Text style={styles.itemText}>done: {item["done"] ? 'true' : 'false'}</Text>
              <View style={styles.actions}>
                <Link href={'/(app)/edit-todos/' + String(item.id)} asChild>
                  <Pressable style={styles.actionBtn}><Text style={styles.actionText}>Edit</Text></Pressable>
                </Link>
                <Pressable
                  onPress={() => ((Number(item['user']) === Number(session.user?.id))) && onDelete(Number(item.id))}
                  style={[styles.actionBtn, styles.deleteBtn, !((Number(item['user']) === Number(session.user?.id))) && styles.actionDisabled]}
                >
                  <Text style={styles.actionText}>Delete</Text>
                </Pressable>
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
