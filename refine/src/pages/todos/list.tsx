import { List, useTable, EditButton, DeleteButton, BooleanField } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";
import { useMany } from "@refinedev/core";
import type { ITodo, ICategory } from "../../interfaces";

const getCategoryId = (value: unknown): string | number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && value !== null && "id" in value) {
    const nested = (value as { id?: unknown }).id;
    if (typeof nested === "string" || typeof nested === "number") return nested;
    return null;
  }
  if (typeof value === "string" || typeof value === "number") return value;
  return null;
};

export const TodoList = () => {
  const { tableProps } = useTable<ITodo>({ syncWithLocation: true });

  const categoryIds = [
    ...new Set(
      (tableProps?.dataSource ?? [])
        .map((todo) => getCategoryId(todo.category))
        .filter((id): id is string | number => id !== null)
    ),
  ];

  const {
    result: categoryResult,
    query: { isLoading: categoryLoading },
  } = useMany<ICategory>({
    resource: "categories",
    ids: categoryIds,
    queryOptions: { enabled: categoryIds.length > 0 },
  });

  const categoryNameById = new Map(
    (categoryResult?.data ?? []).map((category) => [String(category.id), category.name])
  );

  return (
    <List canCreate>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" sorter width={60} />
        <Table.Column dataIndex="task" title="Task" sorter />
        <Table.Column
          dataIndex="category"
          title="Category"
          render={(id) => {
            if (categoryLoading) return "…";
            const categoryId = getCategoryId(id);
            return <Tag>{categoryNameById.get(String(categoryId)) ?? String(categoryId ?? "")}</Tag>;
          }}
        />
        <Table.Column
          dataIndex="done"
          title="Done"
          render={(value) => <BooleanField value={value} />}
        />
        <Table.Column<ITodo>
          title="Actions"
          dataIndex="actions"
          render={(_, record) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
