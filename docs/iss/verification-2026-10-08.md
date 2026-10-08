# 公開前の再検証（2026-10-08、新クラウド環境）

対象：`codex/iss-tracking`、製品コードのコミット `9ec4a98accc55a427e44cd6a4f53e49fc8a43125`。
mainへの統合、GitHub Pagesへの公開、データブランチへの書き込みは実施していない。

## 実通信で確認した事項

- 管理ツールは `observations_current: true`、ネットワーク設定は `enforced`。CelesTrakとNASAの5ホストが管理ツールと `/etc/codex/network-policy.json` に存在する。
- ChromiumのTLS検証とCORSを有効にして、通常のfetchでTLE・OMM JSONともHTTP 200、応答種別 `cors` を確認。TLEはNORAD 25544、両行69文字、両チェックサム正常。
- 要素基準日時：2026-10-08 09:21:12.026592 日本時間（00:21:12.026592 UTC）。OMMを製品の検証関数とSGP4で検証した。
- `node scripts/refresh-iss.cjs /tmp/iss-latest-final.json` が成功。出力は一時ファイルだけで、リポジトリのデータや公開データを変更していない。
- `https://raw.githubusercontent.com/enou123/space-app/iss-data/latest.json` の実応答は404。公開スナップショットはまだ生成されていない。
- CelesTrak TLEの別の試行でHTTP 500も観測した。その後の実通信では200。外部サービスの常時成功を保証する結果ではない。

ChromiumのTLS証明書検証を有効にして実通信を検証した。証明書エラー無視オプションは使用していない。

## 通信失敗のブラウザー検証

`node tests/iss-network.browser.cjs` 成功。外部の実通信成功と、制御したローカルHTTPサーバーによる失敗を区別して検証した。

- CORSヘッダーなし：Chromium自身がCORSエラーを報告し、有効な端末キャッシュを保持。
- HTTP 503・別NORADの不正JSON：キャッシュを保持し、失敗状態を通知。
- 無応答：約10秒で製品のAbortControllerが打ち切り、busyを解除してキャッシュを保持。
- キャッシュがない状態：有効な位置なし。
- 4日前の期限切れキャッシュ：有効な位置なし。
- テスト用の公開スナップショット応答＋直接取得失敗：スナップショットから有効な位置を取得。これは現在404の実公開スナップショットの成功を示すものではない。

失敗時にも元の要素基準日時・取得日時を維持することを確認した。

## NASA画像

NASA公式の現在のダウンロードページ：
https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/

原画像：
https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/december/world.topo.bathy.200412.3x21600x10800.jpg

HTTP 200、29,868,040 bytes、21600×10800。SHA-256 `3006c58b1272362db0a8c2df02dc07cea4b12dfe820b7dc4a159a075caf5d4d4` が、前回使用した固定ミラー原画像と一致。

ChromiumでNASAのプレビュー画像を読み込み・デコード・表示し、同梱2048×1024、4096×2048、8192×4096画像の読み込み・デコードも成功。Visible EarthのコレクションURLはHTTP 200で現在の `science.nasa.gov` ページへ移動した。旧 `eoimages.gsfc.nasa.gov` の候補原画像URLはHTTP 404であり、ドメインへの接続自体は成功した。原画像は公式ページが案内する `assets.science.nasa.gov` のURLで照合した。

## 数値・ブラウザー動作

`node --test tests/*.test.cjs`：23件成功、失敗0。独立SGP4参照値、地球固定座標と距離、期限外・破損キャッシュ、テクスチャ解像度制限・GPU転送失敗、既存の遮蔽・星座配置を含む。

`SPACE_APP_LIVE_ISS=1 node tests/iss.browser.cjs`：PC・iPhone縦・iPhone横の3画面で成功。初期キャッシュや模擬CelesTrak応答を使わず、アプリのStoreが最新OMMを実際に取得して `source: live` となることを確認した。

- 完全実縮尺（scaleMode／scaleBlend＝2）、衛星倍率1、実時間速度、現在時刻同期、地球のGMST自転同期。
- 表示座標で求めた地球中心距離とSGP4の位置ベクトル長が0.000001km以内で一致。地球中心距離は約6798〜6800km、高度は約430〜434km、速度は約7.65km/s（検証時点の値）。
- 時間差と地球に対するISS位置の変化から測った移動速度も約7.65km/s。地球の公転だけで動いていると誤判定しないよう、地球中心のISSベクトルで確認した。
- ISS専用視点の観察点とISS位置が一致。地表の地面・地平線描画を追加しない。ドラッグ、地球中心へ戻す操作、現在時刻への再同期、期限外の非表示、退出時の設定復元、土星・エンケラドゥスの地表視点への切替。
- JavaScript例外・WebGLエラー・横方向の画面はみ出しなし。

`node tests/earth-texture.browser.cjs`：PC／iPhoneで成功。PCの4096・8192の実読込とGPU転送、iPhoneの4096上限と横画面、画像取得失敗時の2048への復帰、再試行、軽量モードでの解放を確認。WebGLエラー0。

`node tests/iss-geometry.browser.cjs` とiPhone横の追加実行：PC・iPhone縦・iPhone横で成功。ホイール／2点ピンチによるズーム、地球の見かけの半径約69.9046°、地球の縁と宇宙を確認。このテストと高精細画像テストには固定した2019年の検証用軌道を使い、実通信テストと区別する。

既存の日時入力・望遠鏡ズーム・地表観察後の縮尺復元は `celestial-controls.browser.cjs` のPC・iPhone縦・iPhone横で成功。ツアー14機能・地表16場面・宇宙19場面・ハレー彗星の尾の伸縮と再生／停止／設定復元は `tours-and-halley.browser.cjs` のPC・iPhone縦・iPhone横で成功。

横画面のハレー彗星は説明カードの右側に配置される。初回テストの「頭がカードより上」という縦画面向けの条件は横画面に適用できなかった。実画面と既存カメラ計算を確認し、カードの矩形と頭の座標が重ならないことを判定するよう修正した。製品コードは変更していない。

結果データ： [ISS生データでの操作](evidence-2026-10-08/iss-live.json)、[実通信・失敗ケース](evidence-2026-10-08/network.json)、[地球画像](evidence-2026-10-08/earth-texture.json)、[日時・カメラ操作](evidence-2026-10-08/controls.json)、[NASA画像](evidence-2026-10-08/nasa-images.json)、[PCツアー](evidence-2026-10-08/tours-pc.json)、[iPhone縦ツアー](evidence-2026-10-08/tours-portrait.json)、[iPhone横ツアー](evidence-2026-10-08/tours-landscape.json)。

画面： [現在データのPC模型](evidence-2026-10-08/live-pc-orbit.png)、[現在データのiPhone縦](evidence-2026-10-08/live-iphone-portrait-orbit.png)、[現在データのiPhone横](evidence-2026-10-08/live-iphone-landscape-earth.png)、[固定検証軌道の地球の縁](evidence-2026-10-08/fixture-pc-horizon.png)、[8192画像](evidence-2026-10-08/pc-earth-8192.png)。

## 検証条件と残る項目

- Chromium 151＋SwiftShader。PC 1000×760、iPhone 13相当の縦390×844・横844×390。iPhoneの操作設定・User-Agentを使用し、描画の画素密度は1。
- ソフトウェアGPUを使った複数ブラウザーの高負荷時に、直接取得の10秒タイムアウトと未取得表示を観測。生データを使った操作テストでは、取得中だけテスト用に描画を停止し、その後は実時計・実データで描画と操作を検証する。実機性能を測定した結果ではない。
- UI自動閉鎖の直前状態・ポインター操作は同じJavaScriptタスク内で検証し、GPU待ちの間にタイマーが進むテスト上の競合を除いた。製品のタイマー設定を変更していない。
- iPhone実機、Safari/WebKit、物理GPUの性能・メモリ、実際のISSの観測位置・姿勢との比較は未検証。
- GitHub Actionsの実行、公開スナップショット生成、GitHub Pagesのビルド・公開画面・資産配信は未検証。mainへの統合と公開の承認後に確認する。
