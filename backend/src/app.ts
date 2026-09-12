import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { closePool, exec, query } from './db.js';

import type {Request, Response} from 'express';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

dotenv.config();

const port = Number(process.env.PORT) || 3000;

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}
));
app.use(express.json());

const handleServerError = (
  res: Response,
  err: unknown,
  message = 'サーバーエラー',
): void => {
  console.error(err);
  res.status(500).json({ error: message });
};

const validateTitle = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return 'ToDoを入力してください。';
  }

  if (value.trim().length > 50) {
    return 'ToDoは50文字以内で入力してください。';
  }

  return null;
};

app.get('/api/todos', async (req: Request, res: Response) => {
  try {
    const sql =
      'SELECT id, title, completed, created_at AS createdAt FROM todos ORDER BY createdAt DESC';
    const rows = await query<Todo>(sql);

    res.status(200).json(rows);
  } catch (err) {
    handleServerError(res, err);
  }
});

app.post('/api/todos', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { title?: unknown };
  const { title } = body;

  const titleError = validateTitle(title);
  if (titleError) {
    res.status(400).json({ error: titleError });
    return;
  }

  const trimmedTitle = (title as string).trim();

  try {
    const sql =
      'INSERT INTO todos (title, completed, created_at) VALUES (?, ?, ?)';
    const params = [trimmedTitle, false, new Date()];

    await exec(sql, params);
    res.status(201).json({ message: 'ToDoを追加しました。' });
  } catch (err) {
    handleServerError(res, err);
  }
});

app.put('/api/todos/:id', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as {
    title?: unknown;
    completed?: unknown;
  };
  const { title, completed } = body;

  const titleError = validateTitle(title);
  if (titleError) {
    res.status(400).json({ error: titleError });
    return;
  }

  if (typeof completed !== 'boolean') {
    res.status(400).json({ error: 'completedは真偽値で指定してください。' });
    return;
  }

  const trimmedTitle = (title as string).trim();

  try {
    const sql = 'UPDATE todos SET title = ?, completed = ? WHERE id = ?';
    const params = [trimmedTitle, completed, req.params.id];
    const result = await exec(sql, params);

    if (result.affectedRows === 0) {
      res.status(404).json({ error: '指定されたToDoが見つかりません。' });
      return;
    }

    res.status(200).json({ message: 'ToDoを更新しました。' });
  } catch (err) {
    handleServerError(res, err);
  }
});

app.delete('/api/todos/:id', async (req: Request, res: Response) => {
  try {
    const sql = 'DELETE FROM todos WHERE id = ?';
    const params = [req.params.id];
    const result = await exec(sql, params);

    if (result.affectedRows === 0) {
      res.status(404).json({ error: '指定されたToDoが見つかりません。' });
      return;
    }

    res.status(200).json({ message: 'ToDoを削除しました。' });
  } catch (err) {
    handleServerError(res, err);
  }
});

app.use((req: Request, res: Response) => {
 res.status(404).set('Content-Type', 'text/html; charset=utf-8');
 res.send('<h1>ページが見つかりませんでした。</h1>');
});

['SIGINT', 'SIGTERM', 'SIGHUP'].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal}を受信。アプリケーションの終了処理中...`);
    await closePool();
    process.exit();
  });
});

app.listen(port, () => {
 console.log(`Webサーバーが起動しました。`);
});
