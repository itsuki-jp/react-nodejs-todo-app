# Render + Aiven デプロイ手順書

この手順書は、既存のReact + Express + MySQL ToDoアプリを、Render FreeのWeb ServiceとAiven Free MySQLで公開するための作業手順です。ブラウザから設定する値に秘密情報が含まれるため、資格情報はGit、ソースコード、スクリーンショット、チャットへ書きません。

## 構成

```text
ブラウザ ──HTTPS──> Render Web Service (Express API + Viteの画面)
                              │
                              └──TLS/MySQL──> Aiven for MySQL
```

Render上では1つのWeb Serviceが画面とAPIの両方を配信します。DBだけをAivenに置くため、RenderのWeb Serviceへ永続ディスクを追加しません。

## 現在の状態と作業前提

- アプリのGitルートは `projects/samurai-github/react-nodejs-todo-app`。画面はVite、APIはExpress、DBドライバーは`mysql2`。
- ルートの`package.json`に本番ビルド用`heroku-postbuild`と起動用`start`がある。Renderではこれらを明示指定する。
- `backend/src/db.ts`はAivenのCAファイルを読み、MySQL2 TLS接続で証明書を検証する。productionでCA pathが未設定なら起動を止める。
- `backend/src/app.ts`はproductionでは`0.0.0.0`、localでは`127.0.0.1`へbindする。Render公式に揃えた明示bindであり、local開発サーバーはLANへ公開しない。
- このGitルートには現在Git remoteが設定されていない。RenderからGitHub連携でデプロイする前に、正しいGitHubリポジトリへpushする必要がある。
- `backend/.env`と`frontend/.env`は各`.gitignore`で除外されており、Git追跡対象ではない。内容をRenderへ一括取り込みしない。現在のローカル値は開かず、Render用の値をダッシュボードに個別登録する。
- `backend/src/aa.md`と`frontend/src/components/phone-comparison-muse.md`は既存の未追跡ファイル。今回の変更に含めず、`git add .`も使わない。

## 0. 実装済みのデプロイ準備とローカル確認

下記のTLS検証とproduction bindはこの作業でコードへ反映済みです。再度編集せず、現行ソースを確認して次のGitHub手順へ進んでください。

### 0-1. HTTP bind

`backend/src/app.ts`はproductionかどうかでbind先を切り替えています。

```ts
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

app.listen(port, host, () => {
  console.log('Webサーバーが起動しました。');
});
```

Renderはアプリに`PORT`を渡します。既存コードは`process.env.PORT`を読んでいるので、`PORT`をRenderの環境変数へ手入力しないでください。Heroku教材もhost省略の`app.listen(port)`ですが、Node.jsの既定bindで到達できるかは実行環境に依存します。今回はRender公式の`0.0.0.0`指定に合わせています。

### 0-2. Aiven CAを検証するTLS接続

`backend/src/db.ts`はproduction時にCA pathを要求し、証明書検証を有効にしてMySQL2へ渡します。

```ts
import fs from 'node:fs';

const caFile = process.env.DB_SSL_CA_FILE;

if (process.env.NODE_ENV === 'production' && !caFile) {
  throw new Error('本番環境ではDB_SSL_CA_FILEが必要です。');
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'react_nodejs_todo_app',
  ...(caFile
    ? {
        ssl: {
          ca: fs.readFileSync(caFile, 'utf8'),
          rejectUnauthorized: true,
        },
      }
    : {}),
};
```

ここで使う`DB_SSL_CA_FILE`はCAファイルのパスで、Render Secret Fileを`aiven-ca.pem`という名前で登録した場合は`/etc/secrets/aiven-ca.pem`です。これはRender固有の要件ではなく、RenderとAiven間の外部DB通信を保護するための設定です。同じAiven DBへHerokuから接続する場合も同じ考え方です。CAファイルの中身をTypeScriptへ貼ったり、`rejectUnauthorized: false`にしたりしないでください。

### 0-3. ローカル確認

アプリGitルートで、既存のコマンドを実行します。

```powershell
npm run heroku-postbuild
```

成功条件はフロントエンドのVite buildとバックエンドのTypeScript buildが両方成功することです。Vite 8はNode.js 20.19+または22.12+を要求します。Renderのbuild logで使われたNode.jsがこの条件を満たさない場合はRender側のNodeバージョンを更新します。この作業ではbuildと既存バックエンドテストに加え、ローカルHTTP APIとChrome上の画面操作を確認済みです。Aiven本物のCAを使った接続はまだ未確認です。

### 0-4. この作業でのローカル検証結果

| 範囲 | 実施内容 | 結果 |
|---|---|---|
| Backend unit | `npm test --prefix backend` | 4件成功 |
| Frontend build | `npm run build --prefix frontend` | 成功 |
| Backend build | `npm run build --prefix backend` | 成功 |
| HTTP API + DB | 認証なし、登録、重複登録、ログイン、Cookie認証、ToDo CRUD、ログアウトを実行 | 401/201/409/200等の期待結果を確認。作成した仮ユーザー3件を削除済み |
| Browser client + integration | Chromeで登録、ログイン、ToDo追加、完了切替、編集、削除、ログアウトを実行 | 画面表示とAPI応答を確認。UIテスト用ユーザーとToDoは削除済み |
| Production-mode server | `NODE_ENV=production`、別PORTで起動し、HTTPとlistenerを確認 | 画面HTTP 200、`0.0.0.0` bindを確認。テスト用CA pathを使い、実際のTLS/DB接続は行っていない |

## 1. GitHubへデプロイ対象をpush

RenderはGitHubリポジトリからソースを取得します。現在このアプリGitルートにremoteがないため、自分が管理する適切なGitHubリポジトリを用意して接続します。URLはGitHubのリポジトリ画面で確認し、推測で作らないでください。

### 1-1. 秘密ファイルが追跡されていないことを確認

```powershell
git check-ignore -v backend/.env frontend/.env
git ls-files backend/.env frontend/.env
git status --short
```

`git check-ignore`は両方の`.env`について除外ルールを表示し、`git ls-files`は何も表示しない状態にします。`.env`が追跡対象として表示された場合はpushせず、追跡解除と、過去にpush済みなら各資格情報のローテーションを先に行います。`.env`の値をチャットやログに貼らないでください。

### 1-2. 変更を限定してcommitする

作業後に差分を確認し、今回のコードと手順書だけを個別にstageします。

```powershell
git status --short
git add backend/src/app.ts backend/src/db.ts RENDER_AIVEN_DEPLOYMENT_GUIDE.md RENDER_DEPLOYMENT_PLAN.md
git diff --cached --name-only
git diff --cached --check
```

既存の`backend/src/aa.md`、`frontend/src/components/phone-comparison-muse.md`や`.env`がstage一覧にあれば、commitせずstageから外して内容を確認します。問題がなければcommitし、GitHubの正しいremoteを設定して`main`へpushします。GitHubのURLは自分のリポジトリの表示値を使います。

```powershell
git remote add origin <GitHubに表示されたリポジトリURL>
git push -u origin main
```

すでに`origin`がある場合は`git remote add`を重ねず、`git remote -v`を確認します。

## 2. AivenでMySQLを作成

### 2-1. Free MySQLサービスを作る

1. ChromeでAiven Consoleを開き、ログイン済みのOrganizationとProjectを確認します。
2. MySQLサービスを新規作成し、Freeプランを選びます。Aiven公式ではFreeは$0/月、期限なし、クレジットカード不要とされています。
3. Freeはリージョンを選べません。サービス作成後、状態が`Running`になるまで待ちます。
4. 作成画面またはサービス概要に表示されるConnection informationから、ホスト、ポート、ユーザー名、パスワード、データベース名を確認します。値は手元のパスワードマネージャー等に保管し、チャットやGitには記録しません。
5. AivenのOverviewからCA Certificateをダウンロードします。ファイル名を`aiven-ca.pem`にして手元の安全な場所に置きます。内容をソースコードへ貼り付けません。

Freeは1GB RAM、1 CPU、1GBストレージ、最大76接続で、単一の災害復旧用バックアップのみです。SLAはありません。長期に利用されない場合は通知後に停止されることがあります。

### 2-2. アプリ用DBとテーブルを作る

Aiven Consoleの対象MySQLサービスでデータベースを作ります（例: `react_nodejs_todo_app`）。作成したDBを選択し、TLS対応MySQLクライアント（例: MySQL Workbench）から以下のDDLを一度実行します。接続先DB名と`DB_NAME`を一致させてください。

```sql
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE todos (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(50) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

`updated_at`は現行APIがToDo一覧で参照するため、教材の初期DDLに加えて作成します。作成後に`SHOW TABLES;`と`DESCRIBE users;`、`DESCRIBE todos;`を実行し、2テーブルと列を確認します。

### 2-3. Render用のDBユーザー

初期スキーマ作成はAivenの初期`avnadmin`ユーザーで行えます。Renderの`DB_USER`には、可能なら実行時専用ユーザーを使います。現行APIが必要とする権限は`SELECT`、`INSERT`、`UPDATE`、`DELETE`です。Aiven公式では、Consoleで作成したユーザーは既定でadmin-level権限になり、`mysql_grants`を指定して絞る方法はAPI/CLI経由です。Console作成ユーザーの権限を確認するのはRenderのデプロイ要件ではなく、Aiven側のセキュリティ上の注意です。Herokuから同じAivenユーザーを使う場合にも当てはまります。最小権限にする場合はAPI/CLIで`mysql_grants`を設定し、上記4権限だけで実行時動作を確認します。DDL変更をアプリユーザーに許可する必要はありません。

## 3. Render Web Serviceを作成

### 3-1. リポジトリとサービスを選ぶ

1. ChromeでRender Dashboardを開きます。
2. `New` → `Web Service`を選び、GitHub連携から上記のアプリリポジトリを選択します。
3. `main`ブランチを選びます。
4. GitHubへアプリの子リポジトリを単独で登録した場合はRoot Directoryを空欄（repo root）のままにします。親の`samurai-engineer`リポジトリを使う場合はRoot Directoryに`projects/samurai-github/react-nodejs-todo-app`を指定します。
5. Language/RuntimeはNodeを選択し、Node.js 22.12以降（または20.19以降）を使います。
6. Instance TypeでFreeを選びます。
7. 次のコマンドを設定します。

| Render設定 | 値 |
|---|---|
| Build Command | `npm run heroku-postbuild` |
| Start Command | `npm start` |

`heroku-postbuild`は名前にHerokuとありますが、これはこのリポジトリのnpm script名です。中でfrontend/backendの依存をinstallし、両方をbuildします。RenderがHeroku設定を自動実行するという意味ではありません。

8. Health Check Pathが設定できる場合は`/`を指定します。
9. Create Web Serviceで初回deployを開始します。環境変数を登録する前の起動失敗は想定内なので、次の手順を先に済ませて再deployします。

## 4. Renderに本番環境変数とCAファイルを登録

サービスの`Environment`ページを開き、以下を登録します。値をソースコード、`render.yaml`、GitHubへ書かないでください。

| Key | 設定する値 |
|---|---|
| `NODE_ENV` | `production` |
| `VITE_API_URL` | `/api` |
| `FRONT_URL` | Renderが発行した実際の公開URL。例: `https://<service-name>.onrender.com` |
| `DB_HOST` | AivenのConnection informationに表示されたHost |
| `DB_PORT` | Aivenに表示されたPort（3306と決めつけない） |
| `DB_USER` | Aivenで作成・確認したMySQLユーザー |
| `DB_PASSWORD` | Aivenで設定されたMySQLユーザーのパスワード |
| `DB_NAME` | 作成したアプリ用データベース名 |
| `DB_SSL_CA_FILE` | `/etc/secrets/aiven-ca.pem` |
| `JWT_SECRET_KEY` | 下記でローカル生成する長いランダム値 |

`PORT`はRenderが設定するため自分で固定しません。`VITE_API_URL`はViteのbuild時にブラウザ側へ埋め込まれる値ですが、値は公開URLではなく同一originの`/api`だけにします。DB接続値やJWT秘密鍵を`VITE_`で始まる名前にしないでください。

PowerShellで本番専用JWT鍵を生成できます。出力は秘密情報として扱い、Renderの`JWT_SECRET_KEY`欄へ直接貼り付けます。

```powershell
node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url') + '\n')"
```

続けてEnvironmentページの`Secret Files`からCAファイルを登録します。

1. `Add Secret File`を選びます。
2. Filenameを`aiven-ca.pem`にします。
3. AivenからダウンロードしたCA PEMの内容を貼り付けます。
4. Saveします。Render上の実行時パスは`/etc/secrets/aiven-ca.pem`です。

環境変数は通常のEnvironment Variables欄、CAはSecret File欄へ設定します。`.env`一括import機能は使わないでください。`Save, rebuild, and deploy`を選び、`VITE_API_URL`がbuild時に反映された状態で再deployします。

## 5. Aivenへの接続制限

Renderのサービス詳細で`Connect` → `Outbound`を開くと、そのRenderサービスの送信元IP rangeを確認できます。Aiven側でTrusted Sources/接続元制限を設定する場合は、公開後のRenderサービスの実際のOutbound rangesを使います。Render Freeに専用固定IPがあるとは想定しないでください。許可範囲の入力が必要な場合でも、インターネット全体を許可するCIDRを安易に設定せず、Aiven側の現在のアクセス制御仕様を確認します。

接続は必ずTLSを有効にし、AivenのCAを検証します。`rejectUnauthorized: false`にして接続エラーを回避しないでください。

## 6. 初回デプロイの確認

Renderの`Events`/`Logs`で最新deployを確認します。

1. Build logで`npm run heroku-postbuild`が成功し、ViteとTypeScriptのbuildが両方完了している。
2. Deploy logで`npm start`が実行され、アプリ起動メッセージが出ている。
3. Renderが割り当てた`https://...onrender.com`をChromeで開き、画面が表示される。
4. `https://...onrender.com/api/auth/check`を未ログイン状態で開く。HTTP 401と認証エラーJSONは未ログイン時の期待結果で、DB疎通の証明にはならない。
5. Chrome DevToolsのNetworkで画面のAPI要求先が`https://...onrender.com/api/...`になっていることを確認する。別origin、CORSエラー、HTTP URLへの送信があれば止めて修正する。

登録、ログイン、ToDo操作で初めてDB往復を確認できます。個人情報を使わず、テスト専用メールアドレスと一時パスワードを使います。

1. 新規登録する。
2. ログインし、ページ再読込後もログイン状態を確認する。
3. ToDoを追加、一覧表示、編集、完了切替を確認する。編集後に更新時刻が変わることも確認する。
4. 別のテストユーザーを登録し、最初のユーザーのToDoが表示されないことを確認する。
5. テストデータを削除する。ログアウト後に認証が解除されることを確認する。
6. Renderの再deploy後にもDBデータが残ることを確認する。

HTTPSでは認証Cookieが`Secure`になります。現在のコードは本番Cookieを`HttpOnly`、`SameSite=Strict`でも設定しています。これらの属性を弱めてログインを通すのではなく、同一origin構成とNetwork上のCookie送受信を確認します。

## 7. エラー時の確認箇所

| 症状 | まず確認すること |
|---|---|
| Render buildでNode version error | Renderが選択したNodeがVite 8要件（20.19+または22.12+）を満たすか。 |
| DeployがPORT検出前に失敗 | Start Commandが`npm start`か、`process.env.PORT`の値でlistenしているか、production時に`0.0.0.0`へbindしているかを確認する（現行コードはこの設定済み）。 |
| `DB_SSL_CA_FILE`がないというエラー | Render Secret FileのFilenameと環境変数パスが一致し、Save & deployしたか。 |
| `self-signed certificate` / TLSエラー | AivenプロジェクトのCAを正しく取得したか、ファイル名・内容・TLS設定が一致するか。証明書検証を無効化しない。 |
| `ECONNREFUSED` / timeout | Aivenの状態、Host、Aiven固有のPort、接続元制限、Render Outbound rangeを確認する。 |
| `Access denied` | DB_USER/DB_PASSWORDとAivenユーザーの認証設定を確認。値をログへ出さない。 |
| `Unknown database` / `Table doesn't exist` | DB_NAMEとAivenで作成したDB名、および`users`/`todos`テーブルを確認する。 |
| 画面は出るがAPIが404/CORS | `VITE_API_URL=/api`がbuild時に設定され、`FRONT_URL`が実際のHTTPS URLと一致するか確認し、rebuildする。 |
| ログイン時にJWT秘密鍵エラー | Renderに`JWT_SECRET_KEY`が登録されているか確認する。値そのものはログへ出さない。 |

## 8. 運用上の制限と安全な保管

- Render Free Web Serviceは15分間受信がないとsleepし、再アクセス時に約1分起動待ちが発生します。Free instance hoursはworkspace単位で月750時間を共有します。
- Render Freeのファイルシステムは一時的です。DBデータや利用者アップロードをRenderローカルへ保存しません。
- Render Freeから外部DB等への大量の送信通信はサービス停止対象となる場合があります。小規模な学習/デモ利用を前提にします。
- Aiven Free MySQLは1GB、76接続上限、SLAなし、単一バックアップです。常時稼働や本番データの唯一の保存先にはしません。
- CA証明書の更新通知が来た場合は新しいCAをAivenから取得し、Render Secret Fileを更新してrebuild/deployします。
- 資格情報がGitHubへpushされた疑いがある場合、ファイル削除だけでは不十分です。AivenのDBパスワードとJWT鍵を更新し、GitHubの公開状態を確認してからRender環境変数を更新します。
- GitHubへpushする前に、stage対象をファイル単位で確認します。環境変数、パスワード、JWT秘密鍵、`.env`、SQLダンプをGitへ含めません。

## 公式資料

- Render: [Web Services](https://render.com/docs/web-services)
- Node.js: [net.Server.listen host省略時の動作](https://nodejs.org/api/net.html#serverlisten)
- Render: [Environment Variables and Secrets / Secret Files](https://render.com/docs/configure-environment-variables)
- Render: [Deploy for Free](https://render.com/docs/free)
- Render: [Outbound IP Addresses](https://render.com/docs/outbound-ip-addresses)
- Aiven: [Aiven for MySQL Free tier](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier)
- Aiven: [MySQL pricing](https://aiven.io/pricing/mysql)
- Aiven: [Connect to Aiven for MySQL](https://aiven.io/docs/products/mysql/howto/connect-from-mysql-workbench)
- Aiven: [Manage MySQL service users and restrict privileges](https://aiven.io/docs/products/mysql/howto/manage-service-users)
- Aiven: [Create MySQL databases](https://aiven.io/docs/products/mysql/howto/create-database)
- Aiven: [TLS/SSL certificates](https://aiven.io/docs/platform/concepts/tls-ssl-certificates)
- MySQL2: [SSL options](https://sidorares.github.io/node-mysql2/docs/documentation/ssl)
- Vite: [Node.js compatibility](https://vite.dev/guide/)
- TERAKOYA: [18章 Herokuにアプリをデプロイしよう](https://terakoya.sejuku.net/programs/221/chapters/3265)
- TERAKOYA: [ToDoアプリをHerokuに公開しよう](https://terakoya.sejuku.net/practices/01K0V5RP9MVGDS9KP28TQY82X9/body)
