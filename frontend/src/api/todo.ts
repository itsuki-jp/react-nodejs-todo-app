interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const apiUrl = import.meta.env.VITE_API_URL;

// 認証エラーをフロントエンドで扱える形に変換する
const handleError = (res: Response, message: string): void => {
  if (res.status === 440) throw new Error("EXPIRED");
  if (!res.ok) throw new Error(message);
};

// APIにリクエストを送信し、ToDo一覧を取得する関数
export const fetchTodos = async (): Promise<Todo[]> => {
  const res = await fetch(`${apiUrl}/todos`, {
    credentials: "include",
  });

  handleError(res, "ToDo一覧の取得に失敗しました。");

  return res.json();
};

// APIにリクエストを送信し、ToDoを追加する関数
export const addTodo = async (title: string): Promise<void> => {
  const res = await fetch(`${apiUrl}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
    credentials: "include",
  });

  handleError(res, "ToDoの追加に失敗しました。");
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
    credentials: "include",
  });

  handleError(res, "ToDoの更新に失敗しました。");
};

// APIにリクエストを送信し、ToDoを削除する関数
export const deleteTodo = async (id: number): Promise<void> => {
  const res = await fetch(`${apiUrl}/todos/${id}`, {
    method: 'DELETE',
    credentials: "include",
  });

  handleError(res, "ToDoの削除に失敗しました。");
};
