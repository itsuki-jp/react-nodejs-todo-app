# ToDoアプリ Render公開計画

実際に操作する順番と環境変数の登録方法は、[Render + Aiven デプロイ手順書](RENDER_AIVEN_DEPLOYMENT_GUIDE.md)を参照。

## Goal

TERAKOYA 18章と課題の公開要件を踏まえ、既存のReact + Express + MySQL ToDoアプリをRenderから公開し、登録・ログイン・ToDo CRUDまでブラウザで確認できる状態にする。

## Current State

- 参照教材はHerokuを使い、Viteのビルド成果物をExpressから配信してフロントエンドとAPIを同一オリジンにまとめている。
- 課題は公開URLの提出と、制作過程で難しかったこと・改善策の記述を求めている。
- 実アプリのGitルートはこのディレクトリ。フロントエンドは`frontend/`、APIは`backend/`、DBアクセスは`mysql2`でMySQLを使う。
- `backend/src/app.ts`には本番時の`frontend/dist`配信と、`PORT`環境変数の参照がすでにある。今回production時は`0.0.0.0`、localは`127.0.0.1`にbindする変更を追加した。`FRONT_URL`を使うCORS設定、Cookie解析、APIルートも存在する。
- ルート`package.json`にはHeroku向けのビルド手順`heroku-postbuild`と起動手順`start`がある。`Procfile`にも`web: npm run start`が記載されている。
- フロント側は`import.meta.env.VITE_API_URL`を全API呼び出しに使い、現在は既定値を設定していない。よって本番用`/api`の設定が必要。
- DB接続は`DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`を読む。認証は`JWT_SECRET_KEY`を使う。`.env`はGit除外対象。
- 本番DBのテーブル作成は、教材ではWorkbenchから手動実行する手順。アプリ起動時に本番テーブルを作る処理は今回の調査範囲では確認できていない。
- 作業開始時点でアプリGitルートに未追跡の`backend/src/aa.md`と`frontend/src/components/phone-comparison-muse.md`がある。計画書作成では変更しない。

## Constraints and Assumptions

### 確認済み

- Render Web ServiceはNode.js/Expressアプリを公開でき、サービスごとにビルドコマンド、起動コマンド、環境変数を設定できる。
- RenderのWeb Service公式手順は`PORT`で指定されたポートを`0.0.0.0`にbindするよう求める。Node.jsはhost省略時にunspecified address（IPv6利用時は`::`）へbindし、多くのOSではIPv4接続も受け付けるため、教材の省略形だけでRenderに接続できないとは断定できない。今回のアプリはRender指定に揃えてproduction時のhostを明示し、ローカルproduction-modeでlistenerを確認した。公開URLでの疎通は未確認。
- Renderが提供するマネージドリレーショナルDBはPostgreSQL。既存アプリはMySQL用ドライバーとMySQL設定を使うため、Render Postgresをそのまま接続先にすることはできない。
- Render無料Web Serviceは15分間アクセスがないと停止し、再アクセス時の起動に約1分かかる。ファイルシステムは一時的で、Free Postgresは1GB・30日で期限切れとなる。今回の構成ではDBを外部に置くのでRender側の永続ディスクは不要。
- Renderは無料Web Serviceから外部DBへ接続できるが、外部データベースへの接続を含むサービス起点の通信量が異常に多い場合、無料サービスを停止する権利を留保している。個人学習規模の少量アクセスを前提とし、利用量はRender Dashboardで確認する。
- Aiven for MySQLのFreeは現時点で$0、クレジットカード不要、期限なし。1ノード・1CPU・1GB RAM・1GBストレージ・バックアップを含むが、Freeには単一の災害復旧用バックアップのみ、`max_connections=76`、SLAなし、VPC/固定IPなし、Free MySQLはOrganizationごとに1つの制限がある。利用が長く止まるとAivenが通知後にサービスを停止することがある。
- Aiven Freeではクラウド/リージョンを選べない。Renderとの距離による応答遅延は接続後に確認する。
- AivenのMySQL接続情報には個別のホストとポートが払い出される。`backend/src/db.ts`はAivenのCAファイルを使ったTLS検証に対応済みで、本番環境では`DB_SSL_CA_FILE`未設定時に起動を止める。実Aivenへの接続確認は未実施。
- Viteの`VITE_`環境変数はビルド時にクライアントコードへ埋め込まれる。DB認証情報など秘密値を`VITE_`変数に入れてはいけない。

### 前提・推奨

- ユーザー希望は無料公開、DBはRender外でもよい。したがって第一案をRender Free Web Service + Aiven Free MySQLにする。アプリのMySQL/`mysql2`実装を保ち、Render内MySQLの有料ディスク運用も避けられる。
- この無料構成は学習・デモ向けとし、本番用途や常時稼働の保証が必要な用途には使わない。アクセス頻度、DBの停止条件、月間無料時間を許容できる前提。
- 同一オリジン構成を維持し、Web Service 1つでSPAとAPIを配信する。フロント/API分割はCORS・Cookie設定を増やすので第一案にしない。
- 課題提出に必要な「開発工程の改善点」は、実際のデプロイを通して本人が経験した問題を記録してから作成する。事前に体験を作らない。

## Proposed Approach

RenderのNode.js Web ServiceをアプリのGitリポジトリに接続し、リポジトリルートをサービスのRoot Directoryにする。ビルドコマンドは既存スクリプトを明示的に呼ぶ`npm run heroku-postbuild`、起動コマンドは`npm start`とする。RenderはHerokuの`heroku-postbuild`や`Procfile`を自動実行する前提にせず、Dashboard上でコマンドを個別に指定する。

本番環境変数に`NODE_ENV=production`、`VITE_API_URL=/api`、`FRONT_URL=<Renderの公開URL>`、DB接続5項目、強いランダム値の`JWT_SECRET_KEY`を設定する。`VITE_API_URL`はフロントエンドビルド時に必要なので、Renderのbuild commandを実行する環境に設定してからビルドする。秘密値はRenderのEnvironment画面に登録し、`.env`やリポジトリには書かない。

DBはAiven Free MySQLを第一候補とする。Aivenの接続画面から払い出されたホスト・ポート・ユーザー・パスワード・DB名とプロジェクトCA証明書を使う。アプリ側のCA検証TLS対応は実装済み。証明書はRenderのSecret File等でサーバー側だけから読み、クライアント側に埋め込まない。教材SQLと現在のAPI要件を照合してから`users`・`todos`テーブルを作成する。Render Postgresへの置き換えはNodeドライバーとSQLの変更を伴うため、今回の無料公開案には含めない。

## DB候補の比較

| 候補 | 無料条件・接続 | 現行MySQLアプリとの適合 | 判断 |
|---|---|---|---|
| **Aiven for MySQL Free** | $0、カード不要。1GBストレージ、接続上限76、非活動時停止の可能性あり。TLS/CA設定が必要。 | MySQLそのものなので最も変更が少ない。 | **第一候補。** 小規模デモ用途に合い、現行のSQLとドライバーを維持できる。 |
| **TiDB Cloud Starter** | 無料枠はストレージ各5GiB（row/columnar）と月5,000万RU。カード不要で開始可能。上限到達時は新規接続が止まる。TLS必須、接続ユーザー名に固有prefixが付く。 | MySQLプロトコル・一般的なMySQL構文に高い互換性があるが、MySQLと完全同一ではない。`AUTO_INCREMENT`の値は連番にならない場合があり、既定照合順序にも差がある。 | **Aivenの有力な代替。** 現行アプリは基本的なCRUD中心なので試す価値があるが、スキーマ作成と登録・CRUD一式をTiDB上で実地確認してから採用する。 |
| **Neon Free (PostgreSQL)** | 無料枠がある。DBはPostgreSQLで、アイドル時に停止する構成。容量・Compute等の枠は変更されうるため作成時に最新条件を確認する。 | `mysql2`から`pg`への変更、`?`プレースホルダーから`$1`形式への変更、MySQL固有DDL（例: `AUTO_INCREMENT`）の移行が必要。 | **DB移行も学習目的に含む場合の候補。** 最短で公開する今回の第一案にはしない。 |
| **Oracle MySQL HeatWave Always Free** | Oracle CloudのAlways Free枠。ネットワーク構成が必要。 | MySQL互換だが、DBシステムのプライベートネットワーク設計や踏み台等が追加で必要になり、Renderから単純接続できない。 | 無料容量の点では候補だが、今回の構成は複雑になるため見送り。 |
| **Railway Free** | トライアル後は月$1分の利用クレジット。超過分を無料運用できるプランではない。 | MySQLを置けるが、DBとWebアプリの継続稼働がクレジット内に収まる保証がない。 | 「無料で継続公開」の候補としては優先しない。 |

**選定方針:** アプリ変更を抑えるならAiven MySQL。Aivenの制限（1GB・非活動時停止など）を避けつつMySQL互換を優先するならTiDB Cloud Starterを次点として比較する。PostgreSQLへ移すことを許容する場合だけNeonを評価する。無料枠の容量・利用量上限や休止条件は変わるため、DB作成直前に公式料金・制限ページを再確認する。

## Phases

### 1. DB方式と接続先を決める

- **目的:** 無料範囲で現在のMySQL実装に接続する。
- **作業:** Aiven Free MySQLを作成し、Consoleの接続情報（host、port、user、password、database、CA certificate）を確認する。Freeはリージョン選択・VPC・固定IPがないこと、容量1GB、76接続上限、停止条件を確認する。
- **完了条件:** 無料枠の制限を受け入れ、接続情報とCAを安全に設定できる。秘密値をGit管理ファイルに保存しない。

### 2. ビルドと起動設定をRenderに合わせる

- **目的:** 1つのWeb ServiceでVite SPAとExpress APIを提供する。
- **作業:** Render Free Web ServiceでアプリのGitリポジトリを選び、Root Directoryはリポジトリルート、Build Commandは`npm run heroku-postbuild`、Start Commandは`npm start`にする。`PORT`を利用していることを確認する。アプリはproduction時に`0.0.0.0`へ明示bindするよう修正済み。Renderの無料750 instance hoursを他サービスと共有すること、15分間の無通信後に停止することを踏まえ公開用途を学習/デモに限定する。
- **完了条件:** デプロイログ上でフロントのVite buildとバックエンドのTypeScript buildが完了し、RenderがHTTPポートを検出してサービスが起動する。

### 3. 環境変数と本番DBを設定する

- **目的:** 本番用API URL、認証Cookie、DB接続を安全に設定する。
- **作業:** 実装済みの`backend/src/db.ts` TLS設定を使い、Render Secret FileからAivenプロジェクトCAを読み込んで証明書を検証する。Renderに`NODE_ENV`、`VITE_API_URL`、`FRONT_URL`、DB接続値、`JWT_SECRET_KEY`を設定する。環境変数変更後にフロントを再ビルドする。Aiven上のDBに`users`・`todos`テーブルを作成し、現行コードの列・制約と照合する。
- **完了条件:** 公開トップページが読み込め、TLS接続でAPIがAiven MySQLへ接続し、テーブルが存在する。環境変数・ログ・ビルド成果物にDBパスワードやJWT秘密値が露出していない。

### 4. 公開URLで受け入れ確認する

- **目的:** 課題の公開要件と実際の利用動作を確認する。
- **作業:** Render公開URLで会員登録、ログイン、ログアウト、ToDo一覧、追加、編集、完了切替、削除を確認する。Cookieがブラウザに保存され、認証後のページ更新でもログイン状態とユーザー別データが保たれることを確認する。ログでCORS、DB接続、静的ファイルの問題を確認する。
- **完了条件:** 全操作が成功し、別ユーザーのToDoが混ざらず、公開URLが再アクセス可能。Renderのスリープ後の起動遅延と、Aivenが長期非活動時に停止する可能性を許容できると確認する。

### 5. 課題提出情報をまとめる

- **目的:** TERAKOYA課題の提出物をそろえる。
- **作業:** Renderの公開URLを控える。実作業で最も困難だった事象、原因、次回の改善策を事実に基づいて短く整理する。
- **完了条件:** 公開URLと本人の振り返りが提出フォームへ転記できる。

## Verification

- **ビルド確認:** Renderのデプロイログで`npm run heroku-postbuild`が成功し、`frontend/dist`と`backend/dist`が生成される。
- **HTTP確認:** 公開URLのトップページとSPAの画面遷移が表示される。APIリクエストが公開URL配下の`/api`へ送られ、別ホストへの誤送信やCORSエラーがない。
- **認証確認:** 会員登録、ログイン、ログアウトを行い、HTTPS Cookieの保存・送信とページ再読み込み後のログイン状態を確認する。
- **データ確認:** ToDoの作成・読取・更新・完了切替・削除を行い、DB内のデータが期待どおり更新される。異なるユーザー間のデータ分離を確認する。
- **再起動確認:** サービス再デプロイ後もDBデータが残ることを確認する。DB事業者のバックアップ・復元手順は別途確認する。
- **TLS確認:** MySQLセッションのSSL状態を確認し、AivenのCA証明書検証が有効であることを確認する。Aivenの接続ポートを正確に設定する。
- **教材課題確認:** 公開URLを提出可能な形で記録し、改善点は今回実際に遭遇した問題を元に書く。

## Risks and Open Questions

- **無料枠の適合:** Aiven Freeは学習/デモに適した候補だが、1GB・1接続上限76・非活動時停止・SLAなし。Render Freeは15分 idle sleep・750時間/月の共有枠・外部DBへの大量接続時停止ポリシーがある。常時稼働や本番可用性を要求する場合は無料案を再検討する。
- **外部DBの実接続:** Aiven Freeのリージョンを選べず、Renderとの距離・TLS接続の遅延はデプロイ後に実測する。Render FreeからAivenへの低頻度MySQL接続は想定構成だが、無料サービスの外向き通信ポリシーを遵守し、実機接続で確認する。
- **証明書の設定:** Aiven Free MySQLはTLSを強制しないが、アプリ側でCAを使ったTLS証明書検証を行う実装は済んでいる。Render Secret Fileへの実CA登録と本番接続はデプロイ時に確認し、CAローテーション時の更新手順も確認する。
- **スキーマ差分:** 教材SQLと現行APIが要求する日時列・外部キー・削除動作を突き合わせる。古い手順をそのまま使うと更新日時など不足する可能性がある。
- **PORT bind:** Heroku教材は`app.listen(port)`でhostを省略している。Node.jsではhost省略時にwildcard bindとなる一方、Render公式は`0.0.0.0`を明示している。このアプリはproduction時に`0.0.0.0`を指定するよう修正済みで、ローカルproduction-modeでもbindを確認した。Render公開URLの疎通はデプロイ後に確認する。
- **Vite環境変数:** `VITE_API_URL`はビルド時に固定される。Render側で設定変更したら再ビルドが必要。

## References

- TERAKOYA: [18章 Herokuにアプリをデプロイしよう](https://terakoya.sejuku.net/programs/221/chapters/3265)（ローカル写し: `projects/05-react-node-todo/lessons/18-chapter-3265.md`）
- TERAKOYA: [ToDoアプリをHerokuに公開しよう](https://terakoya.sejuku.net/practices/01K0V5RP9MVGDS9KP28TQY82X9/body)（ローカル写し: `projects/05-react-node-todo/lessons/practice-01K0V5RP9MVGDS9KP28TQY82X9.md`）
- Render: [Web Services](https://render.com/docs/web-services)
- Render: [Deploying on Render](https://render.com/docs/deploys)
- Render: [Environment Variables and Secrets](https://render.com/docs/configure-environment-variables)
- Render: [Render Postgres](https://render.com/docs/postgresql)
- Render: [Persistent Disks](https://render.com/docs/disks)
- Render: [Deploy for Free](https://render.com/docs/free)
- Aiven: [Aiven for MySQL Free tier](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier)
- Aiven: [Aiven for MySQL pricing](https://aiven.io/pricing/mysql)
- Aiven: [Get started and connect to MySQL](https://aiven.io/docs/products/mysql/get-started)
- Aiven: [TLS/SSL guidance for MySQL connections](https://aiven.io/docs/products/mysql/howto/connect-libredb-studio)
- TiDB Cloud: [Starter plan and free quota](https://docs.pingcap.com/tidbcloud/select-cluster-tier/)
- TiDB Cloud: [MySQL compatibility and differences](https://docs.pingcap.com/tidbcloud/mysql-compatibility/)
- Neon: [Free plan overview](https://neon.com/docs/introduction/plans)
- Oracle: [MySQL HeatWave networking overview](https://docs.oracle.com/en-us/iaas/mysql-database/doc/overview-networking.html)
- Railway: [Free trial and monthly free credit](https://docs.railway.com/pricing/free-trial)
- MySQL2: [SSL connection options](https://sidorares.github.io/node-mysql2/docs/documentation/ssl)
- Vite: [Env Variables and Modes](https://vite.dev/guide/env-and-mode)
