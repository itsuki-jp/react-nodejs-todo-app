import { useEffect,useState } from "react";
import { TodoForm } from './components/TodoForm';
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export const App = () => {
  const [todos,setTodos] = useState<Todo[]>([]);
  const apiUrl = import.meta.env.VITE_API_URL;

  const fetchTodos = async () => {
        const res = await fetch(`${apiUrl}/todos`);

    if (!res.ok) throw new Error('ToDo一覧の取得に失敗しました。');

    return res.json();
  };

  const syncTodos = async () => {
    const todos = await fetchTodos();
    setTodos(todos);
  };

  const addTodo = async (title: string) => {
    const res = await fetch(`${apiUrl}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) throw new Error('ToDoの追加に失敗しました。');
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        await syncTodos();
      } catch (error) {
        alert((error as Error).message);
      }
    };
    initApp();
  }, []);

  const handleSubmit = async (title: string) => {
    try {
      await addTodo(title);
      await syncTodos();
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return(
        <>
      <h2>ToDo一覧</h2>

      <TodoForm onSubmit={handleSubmit} />

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
  )
};
