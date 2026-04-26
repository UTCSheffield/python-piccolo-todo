import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { checkSession, getItem, getItems, updateItem } from '../../../lib/api/client';

export default function EditTodoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const [error, setError] = useState<string | null>(null);
  const [editTask, setEditTask] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDone, setEditDone] = useState(false);
  const [categoriesOptions, setCategoriesOptions] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    checkSession().then(s => {
      if (!s.authenticated) {
        router.replace('/(auth)/login');
        return;
      }
            void getItems<Record<string, unknown>>('categories').then(setCategoriesOptions).catch(() => {});
      if (!Number.isFinite(itemId)) return;
      void getItem<Record<string, unknown>>('todos', itemId)
        .then(item => {
      setEditTask(String(item.task ?? ''));
      setEditCategory(String(item.category ?? ''));
      setEditDone(Boolean(item.done));
        })
        .catch(e => setError(e instanceof Error ? e.message : 'Load failed'));
    });
  }, [id]);

  const onSave = async () => {
    setError(null);
    try {
      await updateItem('todos', itemId, {
      task: editTask,
      category: Number(editCategory),
      done: editDone,
      });
      router.replace('/(app)/todos');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit Todo</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          style={styles.input}
          placeholder="task"
          value={editTask}
          onChangeText={setEditTask}
          
        />
        <Text style={styles.label}>category</Text>
        <View style={styles.chips}>
          {categoriesOptions.map(opt => {
            const id = Number(opt.id);
            const selected = editCategory === String(id);
            const label = String(opt.name ?? opt.title ?? opt.label ?? id);
            return (
              <Pressable key={id} onPress={() => setEditCategory(String(id))} style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>done</Text>
          <Switch value={editDone} onValueChange={setEditDone} />
        </View>
        <Button title="Save" onPress={onSave} />
        <Pressable onPress={() => router.replace('/(app)/todos')} style={styles.cancelBtn}>
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
