# 一般財形・持株会の設定

## データと計算

「その他資産積立状況」はA=日付、B=一般財形残高（円）、C=持株会株数。見出しは1行目。入力は最終行の次へ追記し、D列以降は変更しない。0は入力可能。空欄は未記録と区別するため保存不可。同じ日付を再入力した場合は最後の行を採用する。

週次の日付以前の最新記録を適用する。9/15の記録は9/15〜10/14、10/15の記録は10/15以降に適用する。最初の記録以前へ遡及しない。入力日の残高・株数は当日から有効（給与明細の基準日を入力）。

持株会は週次日付以前の最新終値×その時点の株数を円単位四捨五入。週次シートは日付のみのためその日の終了時点として扱う。当日終値取得前は前営業日分となり、取得後の同期で補完される。7日超の古い株価は欠損扱い。欠損の場合は持株会列を空欄、サイトに「持株会未取得」と表示する（総資産は取得済み分の小計）。

週次シートA〜Fはクローラーの元データとして維持する。末尾に見出しで検出する「一般財形残高」「持株会」「持株会株数」「持株会価格日」「その他資産基準日」を追加する。APIのtotalだけに一般財形と持株会を加算する。B列をこの追加分込みの総額へ変更しないこと（二重計上防止）。クローラーはA〜Fのみ書き込み、シート全体のclearをしないこと。

過去の株価は初回取得値を保存し日々の取得で上書きしない。残高・株数の訂正や遡及入力は該当期間の評価額にも反映する。株式分割が起きた場合、基準日以降の分割後株数を入力するまで評価が不正確になり得る。yfinanceの過去Closeは分割調整を受け得るため、分割を跨ぐ未保存期間の自動バックフィルは行わず、当時の株価・株数を確認して補完する。

## GAS

1. 現在のMoneyManager専用GASをバックアップし、gas_api.jsを反映。SPREADSHEET_IDはGAS内のみ設定（公開コードへ実IDを書かない）。LINE BOTのプロジェクトには貼らない。
2. スクリプトのタイムゾーンをAsia/Tokyoに設定。
3. updateSupplementalAssetsを一度実行して権限を承認する。必要なシート・列が追加される。
4. 同じ関数の時間主導トリガーを1時間ごとに設定。これにより週次クローラー・株価更新後に評価額を補完する。サイトの同期時にも更新する。
5. Webアプリの既存デプロイを「新しいバージョン」に更新。URLを変えずに更新する。

## GitHub Actions / Google認証（秘密鍵なし）

1. Google CloudプロジェクトでGoogle Sheets API、IAM Service Account Credentials API、Security Token Service APIを有効化。
2. 専用サービスアカウントを作成。プロジェクト全体のEditor権限・ドメイン全体の委任は不要。
3. finance_sheetだけをサービスアカウントのメールアドレスへ編集者として共有。リンクを知っている全員へ公開しない。
4. Workload Identity PoolとOIDC Providerを作成。issuerは https://token.actions.githubusercontent.com 。属性にgoogle.subject=assertion.sub、attribute.repository_id=assertion.repository_id、attribute.repository_owner_id=assertion.repository_owner_id、attribute.ref=assertion.refをマッピング。
5. Providerの属性条件で、対象の数値repository_id・repository_owner_idとassertion.ref == 'refs/heads/main'を全て限定。名前だけの条件は避ける。サービスアカウントのroles/iam.workloadIdentityUserはこのPoolの対象repository_idのprincipalSetにだけ付与。
6. GitHubリポジトリ Settings > Secrets and variables > Actionsに次のRepository secretsを登録。

| Secret | 値 |
|---|---|
| FINANCE_SPREADSHEET_ID | finance_sheetのID |
| GCP_WORKLOAD_IDENTITY_PROVIDER | projects/番号/locations/global/workloadIdentityPools/プール/providers/プロバイダ |
| GCP_SERVICE_ACCOUNT | 専用サービスアカウントのメール |

7. Actions > Daily stock prices > Run workflowで検証。株価履歴への追記→GAS更新→サイト同期の順で確認する。

毎日18:17 JST実行。定時実行には遅延・欠落があり、公開リポジトリは60日無活動でscheduleが停止する。GitHubの失敗通知を有効にし、株価履歴の更新日も確認する。yfinanceは非公式で成功保証はない。Yahoo側の利用条件に従う個人利用を前提とする。

初回は直近1か月を取得。取得済み価格日・銘柄は追加しない。株価取得は最大3回試行。Sheets書き込みの通信失敗時は次の実行で既存日付を再確認し、重複を避ける。データ・認証トークン・API応答をログやArtifactsへ保存しない。外部PRでは実行しない。認証可能なmainの編集権限を信頼する人だけに限定する。

公式資料: https://github.com/google-github-actions/auth （Workload Identity Federation through a Service Account）

## 開発時の検証

- `node tests/other-assets.test.cjs`
- `pip install -r scripts/requirements-stock.txt` → `python tests/stock_prices_test.py`
- jsdomを別ディレクトリへインストールし、NODE_PATHをそのnode_modulesへ設定して `node tests/asset-form.test.cjs`
- `python scripts/update_stock_prices.py --check-only` は株価取得のみ（Sheets書き込みなし）。

直近1か月に分割が検出された場合は自動更新を停止する。株数・過去終値の基準を確認したうえで復旧する。
