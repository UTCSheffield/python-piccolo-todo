import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select, Switch } from "antd";
import type { ITodo, ICategory } from "../../interfaces";

export const TodoCreate = () => {
  const { formProps, saveButtonProps } = useForm<ITodo>();
  const { selectProps: categorySelectProps } = useSelect<ICategory>({
    resource: "categories",
    optionLabel: "name",
    optionValue: "id",
    pagination: { mode: "server" },
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Task" name="task" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Category" name="category" rules={[{ required: true }]}>
          <Select {...categorySelectProps} />
        </Form.Item>
        <Form.Item label="Done" name="done" valuePropName="checked" initialValue={false}>
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
};
