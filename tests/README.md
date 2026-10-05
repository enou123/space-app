# 天体ショーの検証

依存ライブラリなしの幾何テスト:

```sh
node --test tests/celestial-physics.test.cjs
```

ブラウザテストは Playwright と Chromium を使用します。リポジトリのルートで HTTP サーバーを起動し、別の端末から実行してください。

```sh
python3 -m http.server 8770 --bind 127.0.0.1
node tests/celestial-shows.browser.cjs
node tests/celestial-controls.browser.cjs
node tests/saturn-depth.browser.cjs
node tests/tours-and-halley.browser.cjs
```

`SPACE_APP_TEST_URL` でサーバー URL を変更できます。Chromium の実行ファイルは `/usr/bin/chromium` を使用します。
PC と iPhone 13 相当の画面・入力設定で、通過／影／食、環の開き角、噴出への進入、噴出通過中の土星に黒い三角模様が出ないこと、入口の追加選択欄がないこと、再生操作、場面切替、縮尺復元、立体視、軽量モードを検証します。
テストだけで観察用の関数を注入します。公開アプリにはその関数を追加しません。
画像と結果 JSON は `/tmp/celestial-*` に保存します。iPhone 実機・Safari そのものの検証ではありません。

`tests/tours-and-halley.browser.cjs` は機能紹介14場面、スマートフォンの5秒後のパネル折り畳みと操作中の維持、立体視・左右間隔・設定復元、地上16／宇宙19場面の選択、ハレー彗星の15時点・尾全体の画面内配置・成長と縮小・再生操作を検証します。画像と結果は `/tmp/tour-*`、`/tmp/tours-and-halley-results.json` に保存します。
