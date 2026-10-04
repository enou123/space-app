# 星座イラストの出典

このフォルダーの34枚のPNGは **Johan Meuris** 作の星座イラストです。Stellarium v0.22.2 の Western sky culture から、アプリが表示する34星座の画像をそのまま同梱しています（画像ファイルの変更なし）。空への配置と青〜青紫の半透明表示・柔らかな発光はアプリの描画時に行います。

- 配布元：[Stellarium v0.22.2 / skycultures/western](https://github.com/Stellarium/stellarium/tree/v0.22.2/skycultures/western)
- 制作者：[Johan Meuris](http://www.johanmeuris.eu/)
- 制作者・画像ライセンスの明記：[Stellarium CREDITS.md §4.12](https://github.com/Stellarium/stellarium/blob/v0.22.2/CREDITS.md)
- PNGのライセンス：**Free Art License 1.3（Licence Art Libre）**。原文を [LICENSE-FAL-1.3.txt](LICENSE-FAL-1.3.txt) に同梱。[英語のライセンス](https://artlibre.org/licence/lal/en/)

`upstream-info.ini` と `upstream-anchors.fab` は元の星座データです。画像内の3つの恒星の位置を、対応するHipparcos恒星の天球方向へ合わせています。Western sky culture のメタデータのライセンス表記は CC BY-SA 4.0 + Free Art License です。元データと、配置データ `index.json` の派生部分は同じ条件で配布します（[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)、[ライセンス全文](LICENSE-CC-BY-SA-4.0.txt)）。

恒星の赤経・赤緯は [Olaf Frohn / d3-celestial stars.8.json](https://github.com/ofrohn/d3-celestial/blob/master/data/stars.8.json) のHipparcos IDから取得し、J2000黄道座標の単位ベクトルへ変換しました。元の著作権・BSDライセンス表記を [LICENSE-star-data.txt](LICENSE-star-data.txt) に同梱しています。`index.json` には対応する星座名、画像名、Hipparcos ID、画像内座標、天球方向、元PNGのSHA-256を記載しています。

画像と配置データはこのアプリと同じサイトから、初めて表示をオンにしたときに読み込みます。34画像と配置データは合計約1.2 MBです。太陽系から遠く離れると恒星の視差により星座の形が変わるため、イラストは太陽から0.01〜0.05光年の間で消えます。星座線は従来どおり観測位置から計算します。
