# 次の環境への引き継ぎ

作業ブランチ：`codex/iss-tracking`。mainへの反映・GitHub Pagesの更新はまだ行っていない。

最初にCelesTrakの実通信を確認する。

```
curl -L -D /tmp/iss-headers.txt -o /tmp/iss.tle -w '%{http_code}\n' 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE'
node scripts/refresh-iss.cjs /tmp/iss-latest.json
```

TLEのNORAD 25544と要素基準日時を確認し、実装が利用するOMM JSONも取得・検証する。NASA高解像度画像の直接取得と固定ミラー画像の照合も残っている。実装・画像出典・制約は `implementation.md`、検証結果は `validation.md` に記録。

最新データを使ったブラウザの追尾・距離・視点切替・現在時刻同期を実操作し、既存機能の検証結果も確認する。問題がなければmainへ通常のpushで反映する（強制push不要）。GitHub Actionsの「Refresh ISS orbital elements」が成功し、`iss-data/latest.json`が最新の要素を配信すること、Pagesのビルド成功と公開画面・新規静的資産の反映を確認する。

この環境ではユーザーが追加した5ドメインが稼働設定revision 2に反映されず、すべてCONNECTプロキシの403となった。HTTP_STATUS=000は接続先本体のHTTP応答が得られていないという意味であり、CelesTrak本体の403ではない。
