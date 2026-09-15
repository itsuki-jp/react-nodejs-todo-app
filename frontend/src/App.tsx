import { useEffect, useState } from "react";
import { addTodo, deleteTodo, fetchTodos, updateTodo } from "./api/todo";
import {
  fetchLoginStatus,
  login,
  logout,
  register,
} from "./api/auth";
import { Header } from "./components/Header";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { TodoForm } from "./components/TodoForm";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const syncTodos = async () => {
    const nextTodos = await fetchTodos();
    setTodos(nextTodos);
  };

  const handleExpired = (error: unknown): boolean => {
    if ((error as Error).message !== "EXPIRED") return false;

    setIsLoggedIn(false);
    setTodos([]);
    setEditingId(null);
    alert("セッションの有効期限が切れました。再度ログインしてください。");
    return true;
  };

  useEffect(() => {
    const initApp = async () => {
      const status = await fetchLoginStatus();
      setIsLoggedIn(status);

      if (!status) return;

      try {
        await syncTodos();
      } catch (error) {
        console.error(error);
        alert("ToDo一覧の取得に失敗しました。");
      }
    };

    void initApp();
  }, []);

  return (
    <>
      <Header
        isLoggedIn={isLoggedIn}
        onClickLogout={async () => {
          try {
            await logout();
            setIsLoggedIn(false);
            setTodos([]);
            setEditingId(null);
            alert("ログアウトしました。");
          } catch (error) {
            alert((error as Error).message);
          }
        }}
        onClickLogin={() => setShowRegister(false)}
        onClickRegister={() => setShowRegister(true)}
      />

      <main>
        {isLoggedIn ? (
          <>
            <h2>ToDo一覧</h2>

            <TodoForm
              onSubmit={async (title) => {
                try {
                  await addTodo(title);
                  await syncTodos();
                } catch (error) {
                  if (handleExpired(error)) return;
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
                            if (handleExpired(error)) return;
                            alert((error as Error).message);
                          }
                        }}
                        initialTitle={todo.title}
                        submitLabel="更新"
                      />
                      <button type="button" onClick={() => setEditingId(null)}>
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <strong>{todo.title}</strong>
                      （作成日時: {new Date(todo.createdAt).toLocaleString("ja-JP")}）
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateTodo(todo.id, todo.title, !todo.completed);
                            await syncTodos();
                          } catch (error) {
                            if (handleExpired(error)) return;
                            alert((error as Error).message);
                          }
                        }}
                        style={{ marginRight: "0.5em" }}
                      >
                        {todo.completed ? "✅" : "☐"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(todo.id)}
                        style={{ marginRight: "0.5em" }}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("本当に削除しますか？")) return;

                          try {
                            await deleteTodo(todo.id);
                            await syncTodos();
                          } catch (error) {
                            if (handleExpired(error)) return;
                            alert((error as Error).message);
                          }
                        }}
                      >
                        削除
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <section>
            <h2>{showRegister ? "会員登録" : "ログイン"}</h2>

            {showRegister ? (
              <RegisterForm
                onSubmit={async (email, password) => {
                  try {
                    await register(email, password);
                    setShowRegister(false);
                    alert("会員登録が完了しました。");
                  } catch (error) {
                    alert((error as Error).message);
                  }
                }}
              />
            ) : (
              <LoginForm
                onSubmit={async (email, password) => {
                  try {
                    await login(email, password);
                    setIsLoggedIn(true);
                    alert("ログインしました。");
                    await syncTodos();
                  } catch (error) {
                    alert((error as Error).message);
                  }
                }}
              />
            )}

            {showRegister ? (
              <>
                <span>すでにアカウントをお持ちですか？</span>
                <button type="button" onClick={() => setShowRegister(false)}>
                  ログイン
                </button>
              </>
            ) : (
              <>
                <span>アカウントをお持ちではありませんか？</span>
                <button type="button" onClick={() => setShowRegister(true)}>
                  会員登録
                </button>
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
};
