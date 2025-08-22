<div align="center">

  <h1>Bible Scraper</h1>

  <p>
    Scrape bible from multiple resources
  </p>

<!-- Badges -->
<p>
  <a href="https://github.com/v-bible/bible-scraper/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/v-bible/bible-scraper" alt="contributors" />
  </a>
  <a href="">
    <img src="https://img.shields.io/github/last-commit/v-bible/bible-scraper" alt="last update" />
  </a>
  <a href="https://github.com/v-bible/bible-scraper/network/members">
    <img src="https://img.shields.io/github/forks/v-bible/bible-scraper" alt="forks" />
  </a>
  <a href="https://github.com/v-bible/bible-scraper/stargazers">
    <img src="https://img.shields.io/github/stars/v-bible/bible-scraper" alt="stars" />
  </a>
  <a href="https://github.com/v-bible/bible-scraper/issues/">
    <img src="https://img.shields.io/github/issues/v-bible/bible-scraper" alt="open issues" />
  </a>
  <a href="https://github.com/v-bible/bible-scraper/blob/main/LICENSE.md">
    <img src="https://img.shields.io/github/license/v-bible/bible-scraper.svg" alt="license" />
  </a>
</p>

<h4>
    <a href="https://github.com/v-bible/bible-scraper/">View Demo</a>
  <span> · </span>
    <a href="https://github.com/v-bible/bible-scraper">Documentation</a>
  <span> · </span>
    <a href="https://github.com/v-bible/bible-scraper/issues/">Report Bug</a>
  <span> · </span>
    <a href="https://github.com/v-bible/bible-scraper/issues/">Request Feature</a>
  </h4>
</div>

<br />

<!-- Table of Contents -->

# :notebook_with_decorative_cover: Table of Contents

- [About the Project](#star2-about-the-project)
  - [Features](#dart-features)
  - [Environment Variables](#key-environment-variables)
- [Getting Started](#toolbox-getting-started)
  - [Prerequisites](#bangbang-prerequisites)
  - [Run Locally](#running-run-locally)
- [Usage](#eyes-usage)
  - [Scripts](#scripts)
    - [Scrape Bible](#scrape-bible)
    - [Inject FTS Content](#inject-fts-content)
    - [Others](#others)
  - [Storage](#storage)
  - [Implemented Features](#implemented-features)
  - [FTS Content Structure](#fts-content-structure)
  - [Notes](#notes)
    - [Bible Version Denominations](#bible-version-denominations)
    - [Bible Old Testament Books Comparison](#bible-old-testament-books-comparison)
    - [Missing Verses](#missing-verses)
- [Contributing](#wave-contributing)
  - [Code of Conduct](#scroll-code-of-conduct)
- [License](#warning-license)
- [Contact](#handshake-contact)
- [Acknowledgements](#gem-acknowledgements)

<!-- About the Project -->

## :star2: About the Project

<!-- Features -->

### :dart: Features

- Scrape bible from:
  - [biblegateway.com](https://www.biblegateway.com/).
  - [bible.com](https://www.bible.com/).
  - [ktcgkpv.org](https://ktcgkpv.org/).
- Currently supports:
  - Verses (with poetry).
  - Footnotes.
  - Headings.
  - References.
  - Psalm metadata (like author, title, etc.).
- Progress logging.
- Save to Postgres & SQLite database.

<!-- Env Variables -->

### :key: Environment Variables

To run this project, you will need to add the following environment variables to
your `.env` file:

- **App configs:**

  `DB_URL`: Postgres database connection URL. Example:
  - Postgres: `postgres://postgres:postgres@localhost:5432/bible`

  - Sqlite: `file:../../dumps/ktcgkpv_org.sqlite3?connection_limit=1&socket_timeout=10`

  `LOG_LEVEL`: Log level.

E.g:

```
# .env
DB_URL="postgres://postgres:postgres@localhost:65439/bible"
LOG_LEVEL=info
```

You can also check out the file `.env.example` to see all required environment
variables.

<!-- Getting Started -->

## :toolbox: Getting Started

<!-- Prerequisites -->

### :bangbang: Prerequisites

This project uses [pnpm](https://pnpm.io/) as package manager:

```bash
npm install --global pnpm
```

Playwright:

Run the following command to download new browser binaries:

```bash
npx playwright install
```

<!-- Run Locally -->

### :running: Run Locally

Clone the project:

```bash
git clone https://github.com/v-bible/bible-scraper.git
```

Go to the project directory:

```bash
cd bible-scraper
```

Install dependencies:

```bash
pnpm install
```

Setup Postgres database using Docker compose:

```bash
docker-compose up -d
```

Migrate the database:

- Sqlite:

  ```bash
  pnpm prisma:migrate:sqlite
  ```

- Postgres:

  ```bash
  pnpm prisma:migrate:pg
  ```

Generate Prisma client:

- Sqlite:

  ```bash
  pnpm prisma:generate --schema ./prisma/sqlite/schema.prisma
  ```

- Postgres:

  ```bash
  pnpm prisma:generate --schema ./prisma/pg/schema.prisma
  ```

<!-- Usage -->

## :eyes: Usage

### Scripts

#### Scrape Bible

> [!NOTE]
> To prevent the error `net::ERR_NETWORK_CHANGED`, you can temporarily disable
> the ipv6 on your network adapter:
>
> ```bash
> sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
> sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
> ```

- Scrape bible (from [biblegateway.com](https://www.biblegateway.com/)):

```bash
npx tsx ./src/biblegateway.com/main.ts
```

- Scrape bible (from [bible.com](https://www.bible.com/)):

```bash
npx tsx ./src/bible.com/main.ts
```

> [!NOTE]
> For the `bible.com` script, it doesn't use the **local** version code, which
> may vary for different languages. For example, in Vietnamese language, version
> `"VCB"` has local code is `"KTHD"`.

- Scrape bible (from [ktcgkpv.org](https://ktcgkpv.org/bible?version=1)):

```bash
npx tsx ./src/ktcgkpv.org/main.ts
```

#### Inject FTS Content

Inject FTS content for SQLite database:

```bash
npx tsx ./src/scripts/inject-fts.ts
```

- Source DB: Defined from `DB_URL` environment variable for Prisma.
- Target DB: Defined in the script.

> [!NOTE]
> For table fields, please refer to the
> [`prisma/sqlite/schema.prisma`](./prisma/sqlite/schema.prisma) and [FTS
> Content Structure](#fts-content-structure)

#### Others

- Scrape Liturgical resources for **Ordinary Times** (Weekdays & Sundays) from
  [catholic-resources.org](https://catholic-resources.org/):

> The Lectionary for Mass - Second USA Edition
> (Sunday Volume, 1998; Weekday Volumes, 2002)

```bash
npx tsx ./src/catholic-resources/main.ts
```

> [!NOTE]
> The script `get-ordinary-time.ts` will log out **mismatch** gospel reading for
> Weekday OT between Year I & II. You can see it in
> [`dumps/catholic-resources/note-ot.txt`](./dumps/catholic-resources/note-ot.txt).

> [!NOTE]
> You can update `SOURCE_DB` and `TARGET_DB` in the script to change the source
> & destination database.

### Storage

Scrape data is stored on Huggingface
[dataset](https://huggingface.co/datasets/v-bible/catholic-resources).

### Implemented Features

Comparing the scraped data from different sources:

<!-- prettier-ignore-start -->

| **Features**                    | **biblegateway.com** | **bible.com** | **ktcgkpv.org** |
|---------------------------------|----------------------|---------------|-----------------|
| Verse                           | ✔️                    | ✔️             | ✔️               |
| Poetry                          | ✔️                    | ✔️             | ✔️               |
| Footnote                        | ✔️                    | ✔️             | ✔️               |
| Cross Reference                 | ✔️                    | ✔️             | ✔️               |
| Psalm Metadata                  | ✔️                    | ✔️             | ✔️               |
| Words of Jesus (red letter)     | ✔️                    | ✔️             | ❌               |
| Proper Names (name translation) | ❌                    | ❌             | ✔️               |

<!-- prettier-ignore-end -->

### FTS Content Structure

The FTS content structure is as follows:

```ts
{
  objectId: string; // Unique identifier for the content
  content: string; // The text content to be indexed
  sortOrder: number; // Sort order for the content
  bookCode: string; // Code of the book (e.g., "gen" for Genesis)
  bookName: string; // Name of the book (e.g., "Genesis")
  testament: string; // Testament type (e.g., "ot", "nt")
  chapterNumber: number; // Chapter number
  chapterId: string; // Unique identifier for the chapter
  type: 'verse' | 'footnote' | 'heading' | 'psalm_metadata' | 'words_of_jesus'; // Type of content
}
```

### Notes

#### Bible Version Denominations

| Version Code | Source           | Name                                 | Denomination |
| ------------ | ---------------- | ------------------------------------ | ------------ |
| KT2011       | ktcgpv.org       | KPA : ấn bản KT 2011                 | Catholic     |
| BD2011       | bible.com        | Kinh Thánh Tiếng Việt, Bản Dịch 2011 | Protestant   |
| BD2011       | biblegateway.com | Bản Dịch 2011 (BD2011)               | Protestant   |

#### Bible Old Testament Books Comparison

<!-- prettier-ignore-start -->
| Thánh Kinh Do Thái | Thánh Kinh Hy Lạp (Bảy Mươi) | Cựu Ước Công Giáo | Cựu Ước Tin Lành |
|---|---|---|---|
| **I. Luật (Torah)**<br>1. Sáng Thế<br>2. Xuất Hành<br>3. Lêvi<br>4. Dân Số<br>5. Đệ Nhị Luật | **I. Ngũ Thư**<br>1. Sáng Thế<br>2. Xuất Hành<br>3. Lêvi<br>4. Dân Số<br>5. Đệ Nhị Luật | **I. Ngũ Thư**<br>1. Sáng Thế<br>2. Xuất Hành<br>3. Lêvi<br>4. Dân Số<br>5. Đệ Nhị Luật | **I. Ngũ Thư**<br>1. Sáng Thế<br>2. Xuất Hành<br>3. Lêvi<br>4. Dân Số<br>5. Đệ Nhị Luật |
| **II. Ngôn sứ**<br>- Ngôn sứ tiền<br>6. Giôsuê<br>7. Thẩm phán<br>8. 1 & 2 Samuel<br>9. 1 & 2 Vua<br>- Ngôn sứ hậu<br>10. Isaia<br>11. Giêrêmia<br>12. Êzêkiel<br>13. Mười hai ngôn sứ<br> <br> <br> <br> <br> <br>  | **II. Lịch sử**<br>6. Giôsuê<br>7. Thẩm phán<br>8. Ruth<br>9. 1 & 2 Samuel<br>10. 1 & 2 Vua<br>11. 1 & 2 Sử biên niên<br>12. Ezra – Nêhêmia<br>13. Ester<br>14. Giuđitha<br>15. Tôbit<br>16. 1 & 2 Maccabê<br> <br> <br> <br> <br>  | **II. Lịch sử**<br>6. Giôsuê<br>7. Thẩm phán<br>8. Ruth<br>9. Samuel 1<br>10. Samuel 2<br>11. Vua 1<br>12. Vua 2<br>13. Sử biên niên 1<br>14. Sử biên niên 2<br>15. Ezra<br>16. Nêhêmia<br>17. Tobia\*<br>18. Giuđitha\*<br>19. Ester<br>20. Maccabê 1\*<br>21. Maccabê 2\* | **II. Lịch sử**<br>6. Giôsuê<br>7. Thẩm phán<br>8. Ruth<br>9. Samuel 1<br>10. Samuel 2<br>11. Vua 1<br>12. Vua 2<br>13. Sử biên niên 1<br>14. Sử biên niên 2<br>15. Ezra<br>16. Nêhêmia<br>17. Ester<br> <br> <br> <br>  |
| **III. Các sách khác**<br>14. Thánh vịnh<br>15. Giob<br>16. Châm ngôn<br>17. Ruth<br>18. Diễm ca<br>19. Giảng viên<br>20. Ai ca<br>21. Ester<br>22. Đaniel<br>23. Ezra – Nêhêmia<br>24. 1 & 2 Sử biên niên | **III. Giáo huấn – Khôn ngoan**<br>17. Thánh vịnh<br>18. Châm ngôn<br>19. Giảng viên<br>20. Diễm ca<br>21. Giob<br>22. Khôn ngoan<br>23. Huấn ca<br> <br> <br> <br>  | **III. Giáo huấn – Khôn ngoan**<br>22. Giob<br>23. Thánh vịnh<br>24. Châm ngôn<br>25. Giảng viên<br>26. Diễm ca<br>27. Khôn ngoan\*<br>28. Huấn ca\*<br> <br> <br> <br> <br>  | **III. Giáo huấn – Khôn ngoan**<br>18. Giob<br>19. Thánh vịnh<br>20. Châm ngôn<br>21. Giảng viên<br>22. Diễm ca<br> <br> <br> <br> <br> <br>  |
|  <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br> <br>  | **IV. Ngôn sứ**<br>24. Ôsê<br>25. Amos<br>26. Mica<br>27. Giôel<br>28. Abđia<br>29. Giôna<br>30. Nahum<br>31. Habacuc<br>32. Sôphônia<br>33. Aggai<br>34. Zacaria<br>35. Malaki<br>36. Isaia<br>37. Giêrêmia<br>38. Baruc<br>39. Ai ca<br>40. Thư của Giêrêmia<br>41. Êzêkiel<br>42. Đaniel | **IV. Ngôn sứ**<br>29. Isaia<br>30. Giêrêmia<br>31. Ai ca<br>32. Baruc\*<br>33. Êzêkiel<br>34. Đaniel<br>35. Ôsê<br>36. Giôel<br>37. Amos<br>38. Abđia<br>39. Giôna<br>40. Mica<br>41. Nahum<br>42. Habacuc<br>43. Sôphônia<br>44. Aggai<br>45. Zacaria<br>46. Malaki<br>  | **IV. Ngôn sứ**<br>23. Isaia<br>24. Giêrêmia<br>25. Ai ca<br>26. Êzêkiel<br>27. Đaniel<br>28. Ôsê<br>29. Giôel<br>30. Amos<br>31. Abđia<br>32. Giôna<br>33. Mica<br>34. Nahum<br>35. Habacuc<br>36. Sôphônia<br>37. Aggai<br>38. Zacaria<br>39. Malaki<br> <br>  |
<!-- prettier-ignore-end -->

> [!NOTE]
> Source: Stephen L. Harris, _Understanding the Bible_, 1997.

> [!NOTE]
> Books marked with `*` is not included in the Old Testament of the Protestant.

#### Missing Verses

- Version: KT2011 - (ktcgkpv.org)

| Book      | Book Code | Missing Verses                                 | Notes            |
| --------- | --------- | ---------------------------------------------- | ---------------- |
| Tô-bi-a   | tb        | chapter 9: 4                                   | Corrected: 3-4   |
| Tô-bi-a   | tb        | chapter 14: 9                                  | Corrected: 8-9   |
| Châm ngôn | cn        | chapter 14: 32                                 | Intended         |
| Huấn ca   | hc        | chapter 1: 5, 7, 21                            | Intended         |
| Huấn ca   | hc        | chapter 3: 19, 25                              | Intended         |
| Huấn ca   | hc        | chapter 10: 21                                 | Intended         |
| Huấn ca   | hc        | chapter 11: 15, 16                             | Intended         |
| Huấn ca   | hc        | chapter 13: 14                                 | Intended         |
| Huấn ca   | hc        | chapter 16: 15, 16                             | Intended         |
| Huấn ca   | hc        | chapter 17: 5, 9, 16, 18, 21                   | Intended         |
| Huấn ca   | hc        | chapter 18: 3                                  | Intended         |
| Huấn ca   | hc        | chapter 19: 18, 19, 21                         | Intended         |
| Huấn ca   | hc        | chapter 22: 7, 8                               | Intended         |
| Huấn ca   | hc        | chapter 24: 18, 24                             | Intended         |
| Huấn ca   | hc        | chapter 25: 12                                 | Intended         |
| Huấn ca   | hc        | chapter 26: 19, 20, 21, 22, 23, 24, 25, 26, 27 | Intended         |
| Gio-an    | ga        | chapter 7: 38                                  | Corrected: 37-38 |

> [!NOTE]
> For missing verses like `tb 9: 3-4`, verse is stored as: number is `3` and label
> is `3-4` or `ga 7: 37-38`, verse is stored as: number is `37` and label is
> `37-38`.

- Version: BD2011 - (biblegateway.com)

| Book | Book Code | Missing Verses    | Notes                   |
| ---- | --------- | ----------------- | ----------------------- |
| Mác  | mark      | chapter 9: 45, 47 | Corrected: 45-46, 47-48 |

- Version: BD2011 - (bible.com)

| Book | Book Code | Missing Verses    | Notes                   |
| ---- | --------- | ----------------- | ----------------------- |
| Mác  | mrk       | chapter 9: 45, 47 | Corrected: 45-46, 47-48 |

<!-- Contributing -->

## :wave: Contributing

<a href="https://github.com/v-bible/bible-scraper/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=v-bible/bible-scraper" />
</a>

Contributions are always welcome!

Please read the [contribution guidelines](./CONTRIBUTING.md).

<!-- Code of Conduct -->

### :scroll: Code of Conduct

Please read the [Code of Conduct](./CODE_OF_CONDUCT.md).

<!-- License -->

## :warning: License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)** License.

[![License: CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-sa/4.0/).

See the **[LICENSE.md](./LICENSE.md)** file for full details.

<!-- Contact -->

## :handshake: Contact

Duong Vinh - [@duckymomo20012](https://twitter.com/duckymomo20012) -
tienvinh.duong4@gmail.com

Project Link: [https://github.com/v-bible/bible-scraper](https://github.com/v-bible/bible-scraper).

<!-- Acknowledgments -->

## :gem: Acknowledgements

Here are useful resources and libraries that we have used in our projects:

- [bible.com](https://www.bible.com/): bible.com website.
- [biblegateway.com](https://www.biblegateway.com/): biblegateway.com website.
- [ktcgkpv.org](https://ktcgkpv.org/): Nhóm Phiên Dịch Các Giờ Kinh Phụng Vụ
  website.
- [The Lectionary for Mass (1998/2002 USA
  Edition)](https://catholic-resources.org/Lectionary/1998USL.htm): compiled by
  Felix Just, S.J., Ph.D.
