import { useEffect, useState } from "react";
import { TodoForm } from "./components/TodoForm";
import { addTodo, deleteTodo, fetchTodos, updateTodo } from "./api/todo";
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const syncTodos = async () => {
    const todos = await fetchTodos();
    setTodos(todos);
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

  return (
    <>
      <h2>ToDo一覧</h2>

      <TodoForm
        onSubmit={async (title) => {
          try {
            await addTodo(title);
            await syncTodos();
          } catch (error) {
            alert((error as Error).message);
          }
        }}
      />

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            {editingId === todo.id ? (
              <>
                <TodoForm
                  key={todo.id}
                  onSubmit={async (title) => {
                    try {
                      await updateTodo(todo.id, title, todo.completed);
                      setEditingId(null);
                      await syncTodos();
                    } catch (error) {
                      alert((error as Error).message);
                    }
                  }}
                  initialTitle={todo.title}
                  submitLabel="更新"
                />
                <button onClick={() => setEditingId(null)}>キャンセル</button>
              </>
            ) : (
              <>
                <strong>{todo.title}</strong>
                （作成日時: {new Date(todo.createdAt).toLocaleString("ja-JP")}）
                <button
                  onClick={async () => {
                    try {
                      await updateTodo(todo.id, todo.title, !todo.completed);
                      await syncTodos();
                    } catch (err) {
                      alert((err as Error).message);
                    }
                  }}
                  style={{ marginRight: "0.5em" }}
                >
                  {todo.completed ? "✅" : "☐"}
                </button>
                <button onClick={() => setEditingId(todo.id)}>編集</button>
                <button onClick={async () => {
                  if (!confirm("本当に削除しますか？")) return;
                  try {
                    await deleteTodo(todo.id);
                    await syncTodos();
                  } catch (error) {
                    alert((error as Error).message);
                  }
                }}>削除</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
};
