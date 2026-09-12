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
    methods: ['GET', 'POST']
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
  const { title } = req.body as { title?: unknown };

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'ToDoを入力してください。' });
    return;
  }

  if (title.trim().length > 50) {
    res.status(400).json({ error: 'ToDoは50文字以内で入力してください。' });
    return;
  }

  try {
    const sql =
      'INSERT INTO todos (title, completed, created_at) VALUES (?, ?, ?)';
    const params = [title.trim(), false, new Date()];

    await exec(sql, params);
    res.status(201).json({ message: 'ToDoを追加しました。' });
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
