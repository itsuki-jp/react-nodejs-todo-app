import { useState } from "react";

import type { SubmitEvent } from "react";

type Props = {
  onSubmit: (email: string, password: string) => void | Promise<void>;
};

export const LoginForm = ({ onSubmit }: Props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }

    void onSubmit(email, password);
    setEmail("");
    setPassword("");
    setError("");
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <label htmlFor="login-email">メールアドレス</label>
      <br />
      <input
        type="email"
        id="login-email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="メールアドレスを入力"
        autoComplete="email"
      />
      <br />
      <label htmlFor="login-password">パスワード</label>
      <br />
      <input
        type="password"
        id="login-password"
        name="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="パスワードを入力"
        autoComplete="current-password"
      />
      <br />
      <button type="submit">ログイン</button>
    </form>
  );
};
