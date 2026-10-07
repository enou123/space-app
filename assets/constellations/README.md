# 蒼い星雲の星座イラスト

34点の新しいイラストは、プロジェクト所有者が指定・承認した5枚のスタイル基準に合わせて制作したAI生成作品です。アンドロメダ座は提供画像を基準にし、女性像の顔立ちも同じ基準に統一しています。人物・動物・象徴物は青白い光、蒼い星雲、透ける衣と霧で表現しています。

アプリ用に透明背景を保ったWebPへ変換しました。通常は1254×1254、画面の短辺が600px以下または軽量モードでは768×768を使用します。初回オン時だけ、最大4枚ずつ読み込みます。新しい画像では追加の色付けやぼかしを行わず、元の色・描写をアルファ付きで重ねます。

PNG原本34点は [素材ダウンロード](../../downloads/) からまとめて保存できます。ファイル名は英語のsnake_caseです。原本を変更せず、`python scripts/build-constellation-art.py /path/to/constellation-set` で配信用画像と `index.json` を再生成できます（Pillowが必要）。生成済み画像は同じサイトから配信するため、AI APIや外部画像サービスへの接続は不要です。

## 天球への配置

`layout.json` は新しい構図のガイド座標です。三つの恒星対応に、最小二乗の相似変換で画像の向き・均一な縮尺・位置・左右を合わせます。接平面で縦横比を保ったまま細分割し、天球へ投影します。新しい構図と恒星配置の違いがあるため、個々のガイド点は近似です。伝統的な絵に対応する位置の解釈を含む鑑賞用イラストであり、天文学的な境界や厳密な星座図ではありません。

恒星間へ離れると視差で星座の形が変わるため、太陽から0.01〜0.05光年の間で絵は消えます。星座線は従来どおり観測位置から計算します。

## 継承した恒星対応・位置データの出典

新イラストはJohan Meurisの旧画像ではありません。恒星の対応のみ、以前の実装から継承しています。

- `upstream-info.ini`、`upstream-anchors.fab`： [Stellarium v0.22.2 Western sky culture](https://github.com/Stellarium/stellarium/tree/v0.22.2/skycultures/western)。Western sky cultureのメタデータはCC BY-SA 4.0 + Free Art License。`layout.json` / `index.json` の派生配置データも同じ条件で配布します。[CC BY-SA全文](LICENSE-CC-BY-SA-4.0.txt)、[Free Art License全文](LICENSE-FAL-1.3.txt)。旧画像の作者はJohan Meurisですが、今回旧PNGは新作品に置き換えました。
- 恒星の赤経・赤緯： [Olaf Frohn / d3-celestial stars.8.json](https://github.com/ofrohn/d3-celestial/blob/master/data/stars.8.json)。Hipparcos IDからJ2000黄道座標の単位ベクトルへ変換しています。[著作権とBSDライセンス](LICENSE-star-data.txt)。
- 伝統的なモチーフの参考：Johannes Hevelius『Uranographia』(1690)、『Urania’s Mirror』。古典の持ち物・動物・神話上の役割を参考にし、絵そのものは複製していません。

`index.json` には星座コード・画像名・ガイド座標・Hipparcos ID・天球方向と、PNG原本および配信用画像のSHA-256を記録しています。
