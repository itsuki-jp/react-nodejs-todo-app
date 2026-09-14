import { Router } from 'express';
import { exec, query } from '../db.js';

import type { Request, Response } from 'express';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
}

const router = Router();

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

// ToDoの全データを返すルート
router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql =
      'SELECT id, title, completed, created_at AS createdAt FROM todos ORDER BY createdAt DESC';
    const rows = await query<Todo>(sql);

    res.status(200).json(rows);
  } catch (err) {
    handleServerError(res, err);
  }
});

// ToDoを追加するルート
router.post('/', async (req: Request, res: Response) => {
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

// ToDoを更新するルート
router.put('/:id', async (req: Request, res: Response) => {
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

// ToDoを削除するルート
router.delete('/:id', async (req: Request, res: Response) => {
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

export default router;
