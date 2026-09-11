import express from 'express';

import type { Request, Response } from 'express';

const port = Number(process.env.PORT) || 3000;

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('<h1>Hello Express</h1>');
});

app.listen(port, () => {
  console.log(`Webサーバーが起動しました。`);
});
