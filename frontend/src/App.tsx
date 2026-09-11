import { useState } from "react";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

const initialTodos: Todo[] = [
  { id: 1, title: 'Reactを勉強する', completed: true, createdAt: new Date() },
  { id: 2, title: 'Node.jsを勉強する', completed: true, createdAt: new Date() },
  { id: 3, title: 'ToDoアプリを作る', completed: false, createdAt: new Date() },
];

export const App = () => {
  const [todos] = useState<Todo[]>(initialTodos);

  return (
    <>
      <h2>ToDo一覧</h2>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <strong>{todo.title}</strong>
            （作成日時: {new Date(todo.createdAt).toLocaleString('ja-JP')}）
            {todo.completed ? '✅' : ''}
          </li>
        ))}
      </ul>
    </>
  );
};
