# 現在の公開状態

mainへの統合・GitHub Pages公開が完了。最新結果・スナップショット404の解消・CelesTrakの一時IP遮断・未検証項目は [publication-2026-10-08.md](publication-2026-10-08.md) を参照。以下は公開前時点の検証引き継ぎ。

# 公開前検証からの引き継ぎ

作業ブランチ：`codex/iss-tracking`。製品コードのHEADは `9ec4a98accc55a427e44cd6a4f53e49fc8a43125`。
検証テスト・出典資料・検証記録・証拠画像をこのブランチに保存する。

公開前検証では統合・公開を実施していない。2026-10-08にユーザーがmainへの統合と既存方式でのGitHub Pages公開を承認した。公開後の結果は別途記録する。

新クラウド環境での実通信とブラウザー再検証は [verification-2026-10-08.md](verification-2026-10-08.md)、詳細データと画面は `evidence-2026-10-08/` を参照。

CelesTrakのTLE・OMM JSONは、ChromiumのTLS検証とCORSを有効にした通常のfetchでHTTP 200を確認。NASA公式原画像と前回の固定ミラーのSHA-256も一致した。初期環境の通信拒否は解消している。


検証の再現：

```
python3 -m http.server 8770 --bind 127.0.0.1
node --test tests/*.test.cjs
node tests/iss-network.browser.cjs
SPACE_APP_LIVE_ISS=1 node tests/iss.browser.cjs
node tests/earth-texture.browser.cjs
node tests/iss-geometry.browser.cjs
SPACE_APP_TEST_PROFILE=iPhone SPACE_APP_TEST_ORIENTATION=landscape node tests/iss-geometry.browser.cjs
node tests/celestial-controls.browser.cjs
SPACE_APP_TEST_PROFILE=iPhone SPACE_APP_TEST_ORIENTATION=landscape node tests/celestial-controls.browser.cjs
node tests/tours-and-halley.browser.cjs
SPACE_APP_TEST_PROFILE=iPhone SPACE_APP_TEST_ORIENTATION=landscape node tests/tours-and-halley.browser.cjs
node scripts/refresh-iss.cjs /tmp/iss-latest.json
```

複数のSwiftShaderブラウザーを同時に動かすと描画待ちが長くなる。生データを使うISS操作テストでは、取得中だけテスト用に描画を停止してネットワーク処理を分離し、その後は実時計・実データで動作させる。CORS拒否・HTTPエラー・約10秒のタイムアウト・不正データ・キャッシュなし・期限切れ・公開スナップショットへの切替は別の制御されたブラウザーテストで検証する。

未検証の公開関連項目：

- `https://raw.githubusercontent.com/enou123/space-app/iss-data/latest.json` は現在404。公開スナップショットはまだ生成されていない。テスト用の応答で確認したキャッシュ切替と混同しない。
- 承認後に最新のmainとの差分・統合方法を確認し、通常のpushで反映する（強制push不要）。
- GitHub Actionsの「Refresh ISS orbital elements」の成功、`iss-data/latest.json` の最新要素とブラウザーでの実取得を確認する。
- Pagesのビルド成功、公開画面、同梱JavaScriptと2048／4096／8192画像の配信を確認する。
- iPhone実機／Safari、物理GPUの性能・メモリ、ISSの実際の観測位置・姿勢との照合は今回の検証範囲外。
