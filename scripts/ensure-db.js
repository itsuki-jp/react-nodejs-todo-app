// XAMPP MariaDB/MySQL が停止していたら自動で起動してから dev に進むためのガード。
// 使い方: npm run dev -> predev として自動実行される (package.json 参照)。
// 依存なし (net/fs/path/child_process のみ)。TCP(3306)が開けばOKとする。
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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
const XAMPP_DIR = process.env.XAMPP_DIR || 'C:\\xampp';
const TIMEOUT_MS = Number(process.env.DB_WAIT_TIMEOUT_MS || 30000);
const INTERVAL_MS = 500;

function checkPort(host, port, timeoutMs = 1500) {
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

async function startXamppMysql() {
  const mysqld = path.join(XAMPP_DIR, 'mysql', 'bin', 'mysqld.exe');
  const ini = path.join(XAMPP_DIR, 'mysql', 'bin', 'my.ini');
  if (!fs.existsSync(mysqld)) {
    console.error(`[ensure-db] mysqld が見つかりません: ${mysqld}`);
    console.error('[ensure-db] XAMPP_DIR が違う場合は set XAMPP_DIR=C:\\path\\to\\xampp してください。');
    return false;
  }
  console.log('[ensure-db] MySQL停止中 → XAMPPのMySQLを自動起動します...');
  try {
    const child = spawn(mysqld, [`--defaults-file=${ini}`, '--standalone'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return true;
  } catch (err) {
    console.error('[ensure-db] mysqld の起動に失敗しました:', err.message);
    return false;
  }
}

(async () => {
  if (await checkPort(HOST, PORT)) {
    console.log(`[ensure-db] DB起動済み (${HOST}:${PORT})`);
    process.exit(0);
  }

  const started = await startXamppMysql();
  if (!started) process.exit(1);

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(INTERVAL_MS);
    if (await checkPort(HOST, PORT)) {
      console.log(`[ensure-db] DBが起動しました (${HOST}:${PORT})`);
      process.exit(0);
    }
  }

  console.error(`[ensure-db] ${TIMEOUT_MS / 1000}秒待っても ${HOST}:${PORT} が開きませんでした。`);
  console.error('[ensure-db] C:\\xampp\\xampp-control.exe でMySQLを手動Startし、mysql_error.log を確認してください。');
  process.exit(1);
})();
