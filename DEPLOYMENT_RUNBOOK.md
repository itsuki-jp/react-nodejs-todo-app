# Render + Aiven デプロイ作業記録

## 目的

TERAKOYA「18章 Herokuにアプリをデプロイしよう」と「ToDoアプリをHerokuに公開しよう」の手順を、このToDoアプリをRender + Aiven MySQLで公開する形に置き換えて実行する。公開URL、アプリ操作、ネットワーク制限、TLS、秘密情報の扱いを確認する。

## 作業上の境界

- Gitルート: `projects/samurai-github/react-nodejs-todo-app`（このディレクトリ単体をprivate GitHub repoにする）
- 秘密値はGit、Markdown、コマンド出力、テストログに書かない。Renderの環境変数とSecret Fileへ設定する。
- `backend/aa.md` と `frontend/src/components/phone-comparison-muse.md` は既存の未追跡ファイル。今回のstage対象から除外する。
- DBは既存Aiven MySQL `mysql-6e03204` を使う。Renderは既存サービスを流用せず、このアプリ用Web Serviceを作る。
- 外部アカウントの変更は、本記録に実施内容と結果を追記してから行う。

## 開始時点

- 既存コード変更: `backend/src/app.ts`、`backend/src/db.ts`
- 既存デプロイ文書: `RENDER_DEPLOYMENT_PLAN.md`、`RENDER_AIVEN_DEPLOYMENT_GUIDE.md`
- Git remote未設定、対象GitHub repo未作成を確認。
- `backend/.env`、`frontend/.env` は各ディレクトリの `.gitignore` により除外され、Git追跡対象ではない。値は読み出さない。
- AivenにはFree MySQL `mysql-6e03204`（`defaultdb`）がRUNNING。テーブルとアプリ専用ユーザーは未確認。
- Renderに対象アプリのserviceはなく、既存の別アプリserviceは停止中。

## 手順と結果

### 2026-09-30 初期調査

1. Gitルート、branch、差分、追跡ファイル、無視対象を確認。branchは `main`、remoteなし。
2. `backend/.env` と `frontend/.env` がignoreされ、未追跡・未stageであることを確認。値は表示しない。
3. 未追跡の `backend/aa.md` と `frontend/src/components/phone-comparison-muse.md` はユーザー既存ファイルとしてstage対象外にする。
4. ローカル一次資料 `projects/05-react-node-todo/lessons/18-chapter-3265.md` と `practice-01K0V5RP9MVGDS9KP28TQY82X9.md` を確認。要件はアプリ公開URLと、実際に起きた問題・改善点の提出。
5. Render/Aivenの接続は読み取り確認のみ。Aiven `ip_filter` は現状 `0.0.0.0/0` と `::/0`、つまり全IPv4/IPv6範囲を許可している。
6. 公式資料ではRender Web ServiceのOutbound rangesをサービス詳細から取得でき、Aiven MySQLのIP filterへCIDRで設定できることを確認。アプリ作成後、Renderの実際のOutbound rangesを取得してallowlistを絞る。
7. GitHubへ登録予定の5ファイルに対するローカルの秘密値パターンスキャンは一致なし。`.env`は追跡外。`git diff --check`成功。frontend/backendのproduction build成功。
8. GitHubに `itsuki-jp/react-nodejs-todo-app` をprivateで作成し、remote `origin` を設定。GitHub API readbackでvisibility=`PRIVATE`を確認。
9. stage対象は `backend/src/app.ts`、`backend/src/db.ts`、`RENDER_DEPLOYMENT_PLAN.md`、`RENDER_AIVEN_DEPLOYMENT_GUIDE.md`、`DEPLOYMENT_RUNBOOK.md` の5件のみ。既存の未追跡Markdown 2件はstageしていない。commit対象とstage内容の一致を確認済み。
10. private repoの作成と初回push完了。commit `0dde843` を `origin/main` へpush。GitHub repo visibilityはPRIVATE。
11. Render MCPのcreate要求は`.git`あり/なし双方のURLでHTTP 400 `invalid or unfetchable`となり、serviceは作られなかった。Render公式資料に従い、Render GitHub AppのRepository accessに対象private repoを加える必要があると判断。権限変更前に対象repoのみの許可画面を確認し、ユーザー承認を得る。

### 次に実行する手順

1. 対象ファイルだけを秘密情報スキャンし、stage対象を確定する。
2. private GitHub repoを作成し、対象ファイルをstage/commit/pushする。push後にrepoのvisibilityを再確認する（完了）。
3. Render GitHub Appが対象private repoを読めるように、Repository accessをこのrepoのみに限定して接続する。Render Web Serviceを作成し、Build=`npm run heroku-postbuild`、Start=`npm start`、region/network情報を記録する。
4. Render serviceのOutbound CIDRを取得し、Aiven MySQLの `ip_filter` をそのCIDRに絞る。適用後の値を読み返す。
5. AivenのDB・アプリ専用user・権限を準備し、Renderの環境変数/CA Secret Fileへ秘密値を登録する。秘密値自体はこの記録に残さない。
6. deploy後にbuild/log、HTTPS画面、auth、ToDo CRUD、ユーザー間分離、DB/TLS疎通を検証し、結果を逐次追記する。

## 更新履歴

- 2026-09-30: 初期状態、現在のリスク、対象範囲、続きの手順を記録。
