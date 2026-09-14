import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { closePool } from './db.js';
import todoRoutes from './routes/todo.js';

import type { Request, Response } from 'express';

dotenv.config();

const port = Number(process.env.PORT) || 3000;

const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}
));
app.use(express.json());

// ToDoのCRUD機能を担当する各ルートを読み込む
app.use('/api/todos', todoRoutes);

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
