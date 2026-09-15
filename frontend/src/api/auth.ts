const apiUrl = import.meta.env.VITE_API_URL;

// APIにリクエストを送信し、ユーザーを登録する関数
export const register = async (
  email: string,
  password: string,
): Promise<void> => {
  const res = await fetch(`${apiUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (res.status === 409) {
    throw new Error("そのメールアドレスはすでに登録済みです。");
  }

  if (!res.ok) {
    throw new Error("会員登録に失敗しました。");
  }
};

// APIにリクエストを送信し、ログインする関数
export const login = async (
  email: string,
  password: string,
): Promise<void> => {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("ログインに失敗しました。");
  }
};

// APIにリクエストを送信し、ログアウトする関数
export const logout = async (): Promise<void> => {
  const res = await fetch(`${apiUrl}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("ログアウトに失敗しました。");
  }
};

// APIにリクエストを送信し、ログイン状態を取得するための関数
export const fetchLoginStatus = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${apiUrl}/auth/check`, {
      credentials: "include",
    });

    if (res.status === 200) return true;
    if (res.status === 401) return false;

    throw new Error("ログイン状態の取得に失敗しました。");
  } catch (error) {
    console.error(error);
    return false;
  }
};
