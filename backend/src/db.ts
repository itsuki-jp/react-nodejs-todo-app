import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

import type { RowDataPacket } from 'mysql2/promise';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'react_nodejs_todo_app',
};

const pool = mysql.createPool(dbConfig);

export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('データベース接続プールを破棄しました。');
  } catch (err) {
    console.error('データベース接続プールの破棄中にエラーが発生しました：', err);
  }
};

export const query = async <T = RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(sql, params as never[]);
    return rows as T[];
  } catch (err) {
    console.error('SQLの実行中にエラーが発生しました：', err);
    throw err;
  }
};
