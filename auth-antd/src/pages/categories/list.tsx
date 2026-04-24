import { List, useTable, EditButton, DeleteButton } from "@refinedev/antd";
import { Table, Space } from "antd";
import type { ICategory } from "../../interfaces";

export const CategoryList = () => {
  const { tableProps } = useTable<ICategory>({ syncWithLocation: true });

  return (
    <List canCreate>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" sorter width={60} />
        <Table.Column dataIndex="name" title="Name" sorter />
        <Table.Column<ICategory>
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
