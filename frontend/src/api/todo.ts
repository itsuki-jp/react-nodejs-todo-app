interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

const apiUrl = import.meta.env.VITE_API_URL;

// APIにリクエストを送信し、ToDo一覧を取得する関数
export const fetchTodos = async (): Promise<Todo[]> => {
  const res = await fetch(`${apiUrl}/todos`);

  if (!res.ok) throw new Error('ToDo一覧の取得に失敗しました。');

  return res.json();
};

// APIにリクエストを送信し、ToDoを追加する関数
export const addTodo = async (title: string): Promise<void> => {
  const res = await fetch(`${apiUrl}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) throw new Error('ToDoの追加に失敗しました。');
};

// APIにリクエストを送信し、ToDoを更新する関数
export const updateTodo = async (
  id: number,
  title: string,
  completed: boolean,
): Promise<void> => {
  const res = await fetch(`${apiUrl}/todos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, completed }),
  });

  if (!res.ok) throw new Error('ToDoの更新に失敗しました。');
};

// APIにリクエストを送信し、ToDoを削除する関数
export const deleteTodo = async (id: number): Promise<void> => {
  const res = await fetch(`${apiUrl}/todos/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error('ToDoの削除に失敗しました。');
};
