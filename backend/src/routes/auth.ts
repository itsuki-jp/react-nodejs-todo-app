import { Router } from 'express';
import bcrypt from 'bcrypt';
import { exec, query } from '../db.js';
import { generateToken, verifyToken } from '../jwt.js';

import type { Request, Response } from 'express';

interface User {
  id: number;
  email: string;
  password: string;
}

const router = Router();

const handleAuthError = (res: Response, err: unknown): void => {
  console.error(err);
  res.status(500).json({ error: 'データベースエラーが発生しました。' });
};

const getCredentials = (
  body: unknown,
): { email: string; password: string } => {
  const value = (body ?? {}) as { email?: unknown; password?: unknown };

  return {
    email: typeof value.email === 'string' ? value.email.trim() : '',
    password: typeof value.password === 'string' ? value.password : '',
  };
};

const validateCredentials = (
  email: string,
  password: string,
): string | null => {
  if (!email || !password.trim()) {
    return 'メールアドレスとパスワードを入力してください。';
  }

  if (password.trim().length < 8) {
    return 'パスワードは8文字以上で入力してください。';
  }

  return null;
};

// ユーザーを登録するルート
router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = getCredentials(req.body);
  const validationError = validateCredentials(email, password);

  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const existingUsers = await query<User>(
      'SELECT id, email, password FROM users WHERE email = ?',
      [email],
    );

    if (existingUsers.length > 0) {
      res.status(409).json({ error: 'そのメールアドレスはすでに登録済みです。' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await exec(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword],
    );

    res.status(201).json({ message: '会員登録に成功しました。' });
  } catch (err) {
    handleAuthError(res, err);
  }
});

// ログイン処理を行うルート
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = getCredentials(req.body);
  const validationError = validateCredentials(email, password);

  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  try {
    const rows = await query<User>(
      'SELECT id, email, password FROM users WHERE email = ?',
      [email],
    );
    const user = rows[0];

    if (!user) {
      res.status(401).json({ error: 'ユーザーが存在しません。' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'パスワードが間違っています。' });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email });
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 60 * 60 * 1000,
    });

    res.status(200).json({ message: 'ログインに成功しました。' });
  } catch (err) {
    handleAuthError(res, err);
  }
});

// ログアウト処理を行うルート
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('authToken');
  res.json({ message: 'ログアウトしました。' });
});

// ログイン済みかどうかを確認するルート
router.get('/check', verifyToken, (_req: Request, res: Response) => {
  res.status(200).json({ message: 'ログイン済みです。' });
});

export default router;
