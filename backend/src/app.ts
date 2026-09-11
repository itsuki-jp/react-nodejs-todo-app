import express from 'express';

import type { Request, Response } from 'express';

const port = Number(process.env.PORT) || 3000;

const app = express();

const todos = [
  { id: 1, title: 'Reactを勉強する', completed: true, createdAt: new Date() },
  { id: 2, title: 'Node.jsを勉強する', completed: true, createdAt: new Date() },
  { id: 3, title: 'ToDoアプリを作る', completed: false, createdAt: new Date() },
];

app.get('/api/todos', (req: Request, res: Response) => {
  res.json(todos);
});

app.use((req: Request, res: Response) => {
  res.status(404).set('Content-Type', 'text/html; charset=utf-8');
  res.send('<h1>ページが見つかりませんでした。</h1>');
});

app.listen(port, () => {
  console.log(`Webサーバーが起動しました。`);
});
