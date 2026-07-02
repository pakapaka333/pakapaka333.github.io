# pakapaka333.github.io

個人ページ(GitHub Pages)。静的 HTML + JavaScript で、コンテンツは CSV / JSON から動的にレンダリングされる。

- 日本語版: https://pakapaka333.github.io/
- 英語版: https://pakapaka333.github.io/en/

## 構成

```
index.html            日本語版エントリ
en/index.html         英語版エントリ(js/lang/en.js を読み込み、dataRoot='../' で初期化)
css/style.css         共通スタイル(ライト/ダークテーマ対応。画像パスもここに一元化)
js/app.js             共通ロジック(言語非依存)
js/lang/{ja,en}.js    UI 文言(LANG オブジェクト)
profile/profile.json  名前・所属・SNS リンク
recent_items/         ヘッダーの「直近のコンテンツ」(recent.json + QR 画像)
data/*.csv            各セクションのデータ
data/bibtex_first/    主著論文の BibTeX
data/bibtex_co/       共著論文の BibTeX
figures/              ヘッダー背景・顔写真・ファビコン
```

## 情報と管理場所の対応表

「どの情報をどこで更新するか」の一覧。⚠ 付きは技術的制約により手動で複数箇所の更新が必要なもの(詳細は後述の「特記事項」)。

| 情報 | 管理場所 | 反映先・更新方法 |
|---|---|---|
| 氏名(日/英) | `profile/profile.json` の `name_ja` / `name_en` | ヘッダー表示・タブタイトル・JSON-LD の `name` / `alternateName` に自動反映。⚠ `<title>`・OGP・noscript は手動 |
| 所属・肩書 | `profile/profile.json` の `affiliations_ja` / `affiliations_en` | ヘッダーのタグ表示に自動反映。⚠ noscript・JSON-LD の `affiliation` は手動 |
| SNS・外部プロフィール URL | `profile/profile.json` の `links` 配列 | SNS ボタンと JSON-LD `sameAs` に自動反映(下記参照)。⚠ noscript 内 Scholar リンクのみ手動 |
| 研究業績 | `data/research_history.csv` + `data/bibtex_*/` | 自動反映。著者リストは BibTeX から自動抽出 |
| 対外活動 | `data/activities.csv` | 自動反映 |
| 学歴 | `data/education_history.csv` | 自動反映 |
| 職歴 | `data/business_history.csv` | 自動反映 |
| スキル(カテゴリ含む) | `data/skills.csv` | 自動反映。カテゴリのフィルタボタンも CSV から動的生成 |
| 直近のコンテンツ(QR) | `recent_items/items/recent.json` + `recent_items/qrsrc/` | 自動反映 |
| UI 文言(見出し・ボタン等) | `js/lang/ja.js` / `js/lang/en.js` | `LANG` オブジェクトを両言語で対で編集 |
| 画像(顔写真・ヘッダー背景) | `figures/` + パス指定は `css/style.css` のみ | ファイル差し替えのみで両ページに反映 |
| ファビコン | `figures/favicon.png`(48px) / `apple-touch-icon.png`(180px) | 差し替えのみ。顔写真から生成 |
| ページメタ(title/description/OGP) | ⚠ `index.html` / `en/index.html` に直書き | 両ファイルを手動で対で編集 |
| サイト URL(canonical/hreflang 等) | ⚠ `index.html` / `en/index.html` に直書き | ドメイン変更時のみ両ファイルを一括置換 |
| 表の初期表示行数 | `js/app.js` の `DEFAULT_ROWS`(コード定数) | 数値を変更 |

## データ更新のルール

### SNS・外部プロフィールの URL(一元管理)

Google Scholar / LinkedIn / X / GitHub などの URL は **`profile/profile.json` の `links` 配列だけを編集する**。ここが唯一の管理場所で、以下がすべて自動で追従する:

- ヘッダーの SNS アイコンボタン(記載順に表示)
- 両ページの JSON-LD `sameAs`(`app.js` の `updateJsonLd()` が注入)

```json
"links": [
  { "type": "linkedin", "url": "https://..." },
  { "type": "github",   "url": "https://..." }
]
```

- `type` が `linkedin` / `x` / `scholar` / `github` なら専用アイコンが使われる(`app.js` の `SNS_META`)。それ以外の `type` は汎用リンクアイコンで表示され、`label` キーでツールチップ文言を指定できる。
- 新サービスに専用アイコンを足したい場合のみ `SNS_META` に SVG を追加する。

### 共通

- **多言語カラム**: どの CSV も `title` に対して `title_en` のように `_en` サフィックス付きカラムを追加すると英語版で使われる。`_en` が空なら無印カラムにフォールバックする(`app.js` の `field()`)。
- **period**: `2025/3`、`2025/10/20`、`2023/8/27-9/6`、`2021/4 -` の形式に対応。範囲の場合は開始日でソートされる。
- **award**: セミコロン `;` 区切りで複数の受賞を記述する(例: `若手奨励賞;スポンサー賞`)。
- **カラム数**: 各行のフィールド数はヘッダーと一致させること。ずれると列の対応が崩れる(ブラウザのコンソールに警告が出る)。

### data/research_history.csv

`period, title, title_en, venue, venue_en, venue_link, venue_type, paper_link, slide_link, poster_link, award, award_en, is_first_author, is_domestic, bibSrc`

- `is_first_author` / `is_domestic`: `true` / `false`
- `bibSrc`: リポジトリルートからの相対パス(例: `data/bibtex_first/xxx.bib`)。著者リストはこの BibTeX の `author` フィールドから自動抽出される。

### data/activities.csv

`period, title, title_en, details, details_en, link, award, award_en`

### data/education_history.csv

`period, school, department, degree, status, distinction`(+ 各 `_en`)。`status` は `在学中` / `ongoing` で在学中バッジになる。

### data/business_history.csv

`period, company, role`(+ 各 `_en`)

### data/skills.csv

`skill, skill_en, description, description_en, category, category_en`

- カテゴリは CSV から動的に収集され、**新しいカテゴリは CSV に書くだけ**でフィルタボタンが増える(コード変更不要)。
- バッジの色を分けたい場合のみ `app.js` の `SKILL_BADGE_CLASS` にカテゴリ名 → CSS クラスの対応を追加する(未登録カテゴリは `badge-tech` の緑になる)。

### recent_items/items/recent.json

ヘッダー右側の QR コード付き最新コンテンツ。`desc_ja` / `desc_en`(改行は `\n`)、`items[].type_ja` / `type_en` / `qrSrc` / `link`。

## 特記事項: 技術的制約で一元管理できないもの

このサイトはビルドステップなしの静的ホスティングのため、**JS 実行前に必要な情報は HTML への直書きが避けられない**。以下は該当箇所を手動で更新すること。

| 情報 | 直書き箇所 | 直書きが必要な理由 |
|---|---|---|
| `<title>`・meta description・OGP・Twitter Card | `index.html` / `en/index.html` の `<head>` | X・Slack・LINE などの SNS クローラーは JS を実行せず静的 HTML だけを読むため、JS で注入しても認識されない |
| canonical / hreflang / og:url のサイト URL | 同上 | 同上(かつ `<head>` 内リンク要素はクローラーが初期 HTML で評価する) |
| JSON-LD の `url` / `image` / `affiliation` | 両 HTML の `<head>` 内 `application/ld+json` | JS 非実行クローラー向けの静的フォールバック。`name` / `alternateName` / `sameAs` は `app.js` が profile.json から上書きするので、**氏名・リンク変更時にここは触らなくてよい**(所属変更時のみ手動) |
| `<noscript>` の氏名・所属・Scholar リンク | 両 HTML の `<body>` 末尾 | noscript は「JS が無効な環境」でだけ表示される領域なので、原理的に JS から内容を注入できない |
| 「読み込み中…」テキスト | 両 HTML の `<main>` 内 | JS がデータを取得する前に表示されるプレースホルダーのため |

運用上は「**氏名・所属・メタ情報を変えるときだけ `index.html` と `en/index.html` を対で grep して更新する**」と覚えておけばよい。それ以外の日常的な更新(業績・活動・スキル・リンク追加)はすべて JSON / CSV の編集だけで完結する。

## 画像

`figures/` の画像は表示サイズに合わせて縮小済み(顔写真 400px、ヘッダー 1600px 幅)。 <br>
差し替える際も同程度に圧縮すること。ファビコン(`favicon.png` 48px / `apple-touch-icon.png` 180px)は顔写真から生成。

画像のパス指定は `css/style.css` のみにある(CSS の `url()` はスタイルシートの場所を基準に解決されるため、`en/` 配下のページでも同じ指定で動く)。ファイル名を変えない限り HTML の変更は不要。
