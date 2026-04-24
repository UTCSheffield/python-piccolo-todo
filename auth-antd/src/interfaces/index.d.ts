export interface ICategory {
  id: number;
  name: string;
}

export interface ITodo {
  id: number;
  task: string;
  done: boolean;
  category: number;
  user: number;
}
