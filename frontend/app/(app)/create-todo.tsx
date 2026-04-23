import React, { useEffect, useState } from 'react';
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
import { useCreateTodo, useCategories } from '@/lib/api';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export default function CreateTodoScreen() {
  const router = useRouter();
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateTodo();
  const [task, setTask] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id.toString());
    }
  }, [categories, selectedCategory]);

  const handleCreate = async () => {
    if (!task.trim()) {
      setError('Please enter a task');
      return;
    }

    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    try {
      setError('');
      await createMutation.mutateAsync({
        task: task.trim(),
        category: parseInt(selectedCategory, 10),
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create todo');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create New Todo</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.field}>
          <Text style={styles.label}>Task</Text>
          <TextInput
            style={styles.input}
            placeholder="What do you need to do?"
            value={task}
            onChangeText={setTask}
            editable={!createMutation.isPending}
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
                enabled={!createMutation.isPending}
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

        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={createMutation.isPending}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.button, createMutation.isPending && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create</Text>
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
