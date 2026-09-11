import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { closePool, query } from './db.js';

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
    methods:['GET']
}
));

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
