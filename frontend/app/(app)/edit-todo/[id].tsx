import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useUpdateTodo, useCategories, useTodoDetail } from '@/lib/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';

export default function EditTodoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const todoId = id ? parseInt(id, 10) : 0;
  
  const { data: todo, isLoading } = useTodoDetail(todoId);
  const { data: categories = [] } = useCategories();
  const updateMutation = useUpdateTodo(todoId);
  
  const [task, setTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (todo) {
      setTask(todo.task);
      setDone(todo.done);
      setSelectedCategory(
        typeof todo.category === 'number'
          ? todo.category.toString()
          : todo.category.id.toString()
      );
    }
  }, [todo]);

  const handleUpdate = async () => {
    if (!task.trim()) {
      setError('Please enter a task');
      return;
    }

    try {
      setError('');
      await updateMutation.mutateAsync({
        task: task.trim(),
        category: parseInt(selectedCategory, 10),
        done,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to update todo');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!todo) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>Todo not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Edit Todo</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.field}>
          <Text style={styles.label}>Task</Text>
          <TextInput
            style={styles.input}
            placeholder="What do you need to do?"
            value={task}
            onChangeText={setTask}
            editable={!updateMutation.isPending}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          {categories.length > 0 ? (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCategory}
                onValueChange={setSelectedCategory}
                enabled={!updateMutation.isPending}
              >
                {categories.map((cat) => (
                  <Picker.Item
                    key={cat.id}
                    label={cat.name}
                    value={cat.id.toString()}
                  />
                ))}
              </Picker>
            </View>
          ) : (
            <Text style={styles.noCategories}>No categories available</Text>
          )}
        </View>

        <View style={styles.field}>
          <Pressable
            style={styles.checkboxField}
            onPress={() => setDone(!done)}
            disabled={updateMutation.isPending}
          >
            <View style={[styles.checkbox, done && styles.checkboxChecked]}>
              {done && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Mark as done</Text>
          </Pressable>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={updateMutation.isPending}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.button, updateMutation.isPending && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    marginBottom: theme.spacing.lg,
  },
  field: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    color: theme.colors.secondaryText,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    borderRadius: theme.radius,
    fontSize: theme.fontSize.base,
    backgroundColor: theme.colors.backgroundLight,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    backgroundColor: theme.colors.backgroundLight,
    overflow: 'hidden',
  },
  noCategories: {
    color: theme.colors.disabled,
    fontSize: theme.fontSize.sm,
    paddingVertical: theme.spacing.sm,
    textAlign: 'center',
  },
  checkboxField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  checkmark: {
    color: theme.colors.primaryText,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: theme.fontSize.base,
    color: theme.colors.secondaryText,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  button: {
    flex: 1,
    padding: theme.button.padding,
    borderRadius: theme.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: theme.colors.secondary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.primaryText,
    fontSize: theme.fontSize.base,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: theme.colors.secondaryText,
    fontSize: theme.fontSize.base,
    fontWeight: '600',
  },
  error: {
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
    fontSize: theme.fontSize.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.errorBackground,
    borderRadius: 4,
  },
});
