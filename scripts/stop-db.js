// XAMPP MariaDB/MySQL をグレースフルに停止する。
// ensure-db が detached 起動するため Ctrl+C では止まらない。その分はこれで止める。
// 使い方: npm run db:stop
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function loadBackendEnv() {
  const envPath = path.join(ROOT, 'backend', '.env');
  const out = {};
  try {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {
    // backend/.env がなくてもデフォルトで動く
  }
  return out;
}

const fileEnv = loadBackendEnv();
const HOST = process.env.DB_HOST || fileEnv.DB_HOST || '127.0.0.1';
const PORT = Number(process.env.DB_PORT || fileEnv.DB_PORT || 3306);
const USER = process.env.DB_USER || fileEnv.DB_USER || 'root';
const PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : fileEnv.DB_PASSWORD || '';
const XAMPP_DIR = process.env.XAMPP_DIR || 'C:\\xampp';

function checkPort(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  if (!(await checkPort(HOST, PORT))) {
    console.log('[stop-db] DBはすでに停止しています。');
    process.exit(0);
  }

  const admin = path.join(XAMPP_DIR, 'mysql', 'bin', 'mysqladmin.exe');
  if (!fs.existsSync(admin)) {
    console.error(`[stop-db] mysqladmin が見つかりません: ${admin}`);
    console.error('[stop-db] XAMPP_DIR が違う場合は set XAMPP_DIR=C:\\path\\to\\xampp してください。');
    process.exit(1);
  }

  const args = [`-h${HOST}`, `-u${USER}`, 'shutdown'];
  if (PASSWORD) args.splice(2, 0, `-p${PASSWORD}`);
  const r = spawnSync(admin, args, { stdio: 'inherit', windowsHide: true });

  if (r.error) {
    console.error('[stop-db] mysqladmin の実行に失敗しました:', r.error.message);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error('[stop-db] shutdownに失敗しました。XAMPP Control Panelから手動Stopしてください。');
    process.exit(1);
  }

  // ポートが閉じるまで待つ
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    await sleep(500);
    if (!(await checkPort(HOST, PORT))) {
      console.log('[stop-db] DBを停止しました。');
      process.exit(0);
    }
  }
  console.error('[stop-db] 停止シグナルは送りましたがポートが閉じません。Control Panelを確認してください。');
  process.exit(1);
})();
