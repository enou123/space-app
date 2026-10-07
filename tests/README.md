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
node tests/halley-camera.browser.cjs
```

`SPACE_APP_TEST_URL` でサーバー URL を変更できます。Chromium の実行ファイルは `/usr/bin/chromium` を使用します。
PC と iPhone 13 相当の画面・入力設定で、通過／影／食、環の開き角、噴出への進入、噴出通過中の土星に黒い三角模様が出ないこと、入口の追加選択欄がないこと、再生操作、場面切替、縮尺復元、立体視、軽量モードを検証します。
テストだけで観察用の関数を注入します。公開アプリにはその関数を追加しません。
画像と結果 JSON は `/tmp/celestial-*` に保存します。iPhone 実機・Safari そのものの検証ではありません。

`tests/tours-and-halley.browser.cjs` は機能紹介14場面、スマートフォンの5秒後のパネル折り畳みと操作中の維持、立体視・左右間隔・設定復元、地上16／宇宙19場面の選択、ハレー彗星の15時点・尾全体の画面内配置・成長と縮小・再生操作を検証します。画像と結果は `/tmp/tour-*`、`/tmp/tours-and-halley-results.json` に保存します。

`tests/halley-camera.browser.cjs` はPC・iPhone相当・横向きでハレー彗星31時点を検証します。28秒以降の太陽と彗星の同時表示、案内カードとの重なり、広い場面での尾全体、太陽を回る画面上の動き、2回の接近、停止時のカメラと時刻を確認します。画像と結果は `/tmp/halley-camera-*` に保存します。

## 星座イラスト

```sh
node --test tests/constellation-art.test.cjs
node tests/constellation-art.browser.cjs
node tests/constellation-sky.browser.cjs
```

34点の重複・欠落・チェックサム、ガイド恒星の位置合わせ、投影の縦横比と左右を確認します。ブラウザではPC通常画像、iPhone相当の軽量画像、6種の代表構図、濃さの変更、軽量モードへの切替、横向き、オフ・オン時の再利用、1枚の読み込み失敗後の再試行を検証します。画像と結果は `/tmp/constellation-*` に保存します。公開アプリにはテスト用関数を含めません。

`tests/constellation-sky.browser.cjs` は熊本の夜空、月面の空でイラストと地面・星座線が共存することをPC・iPhone相当で確認し、素材ページのZIPがブラウザからダウンロードできることも検証します。
