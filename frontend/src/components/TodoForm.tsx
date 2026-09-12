import { useState } from "react";

import type { SubmitEvent } from "react";

type Props = {
  onSubmit: (title: string) => void | Promise<void>;
};

export const TodoForm = ({ onSubmit }: Props) => {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("ToDoを入力してください。");
      return;
    }
    if (trimmedTitle.length > 50) {
      setError("ToDoは50文字以内で入力してください。");
      return;
    }

    void onSubmit(trimmedTitle);
    setTitle("");
    setError("");
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        type="text"
        name="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="ToDoを入力"
        maxLength={50}
      />
      <button type="submit">追加</button>
    </form>
  );
};
