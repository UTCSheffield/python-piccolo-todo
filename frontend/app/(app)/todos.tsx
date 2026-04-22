import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTodos, useUpdateTodo, useDeleteTodo, useCategories } from '@/lib/api';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import type { Todo } from '@/lib/api/types';

export default function TodoListScreen() {
  const router = useRouter();
  const { data: todos = [], isLoading, error } = useTodos();
  const { data: categories = [] } = useCategories();
  const updateMutation = useUpdateTodo();
  const deleteMutation = useDeleteTodo();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const handleToggleDone = (todo: Todo) => {
    updateMutation.mutate({ id: todo.id, done: !todo.done });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleCreate = () => {
    router.push('/(app)/create-todo');
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>Failed to load todos</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Todos</Text>
        <Pressable style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createButtonText}>+ New</Text>
        </Pressable>
      </View>

      {todos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No todos yet</Text>
          <Pressable style={styles.createButton} onPress={handleCreate}>
            <Text style={styles.createButtonText}>Create Your First Todo</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={todos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View key={item.id} style={styles.todoItem}>
              <Pressable
                style={styles.todoContent}
                onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <Pressable onPress={() => handleToggleDone(item)}>
                  <View
                    style={[
                      styles.checkbox,
                      item.done && styles.checkboxChecked,
                    ]}
                  >
                    {item.done && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.todoText,
                      item.done && styles.todoTextDone,
                    ]}
                    numberOfLines={1}
                  >
                    {item.task}
                  </Text>
                  <Text style={styles.category}>
                    {typeof item.category === 'number'
                      ? categoryMap[item.category] || 'Unknown'
                      : item.category.name}
                  </Text>
                </View>
              </Pressable>

              {expandedId === item.id && (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => router.push(`/(app)/edit-todo/${item.id}`)}
                  >
                    <Text style={styles.actionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 6,
  },
  createButtonText: {
    color: theme.colors.primaryText,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.disabled,
    marginBottom: theme.spacing.lg,
  },
  listContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  todoItem: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: theme.radius,
    marginBottom: theme.spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  todoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  checkmark: {
    color: theme.colors.primaryText,
    fontWeight: 'bold',
  },
  todoText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.secondaryText,
    fontWeight: '500',
  },
  todoTextDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.disabled,
  },
  category: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.disabled,
    marginTop: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  actionButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: theme.colors.secondary,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
  },
  actionText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  deleteText: {
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.base,
  },
});
