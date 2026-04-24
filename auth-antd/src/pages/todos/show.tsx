import { Show } from "@refinedev/antd";
import { useShow, useOne } from "@refinedev/core";
import { Typography, Tag } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { ITodo, ICategory } from "../../interfaces";

const { Title, Text } = Typography;

export const TodoShow = () => {
  const { query } = useShow<ITodo>();
  const { data, isLoading } = query;
  const record = data?.data;

  const { data: categoryData, isLoading: categoryLoading } = useOne<ICategory>({
    resource: "categories",
    id: record?.category ?? "",
    queryOptions: { enabled: !!record },
  });

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>ID</Title>
      <Text>{record?.id}</Text>

      <Title level={5}>Task</Title>
      <Text>{record?.task}</Text>

      <Title level={5}>Category</Title>
      <Text>{categoryLoading ? "…" : categoryData?.data?.name}</Text>

      <Title level={5}>Done</Title>
      {record?.done ? (
        <Tag icon={<CheckCircleOutlined />} color="success">Yes</Tag>
      ) : (
        <Tag icon={<CloseCircleOutlined />} color="default">No</Tag>
      )}
    </Show>
  );
};
