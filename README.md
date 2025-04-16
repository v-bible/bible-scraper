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
  - [Implemented Features](#implemented-features)
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

  - Sqlite: `file:../../dumps/ktcgkpv_sqlite.db`

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
  pnpm prisma:migrate --schema ./prisma/sqlite/schema.prisma
  ```

- Postgres:

  ```bash
  pnpm prisma:migrate --schema ./prisma/pg/schema.prisma
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
npx tsx ./src/biblegateway/main.ts
```

- Scrape bible (from [bible.com](https://www.bible.com/)):

```bash
npx tsx ./src/bibledotcom/main.ts
```

> [!NOTE]
> For the `bible.com` script, it doesn't use the **local** version code, which
> may vary for different languages. For example, in Vietnamese language, version
> `"VCB"` has local code is `"KTHD"`.

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

- Scrape bible (from [ktcgkpv.org](https://ktcgkpv.org/bible?version=1)):

```bash
npx tsx ./src/ktcgkpv/main.ts
```

- Inject FTS content to the SQLite database:

```bash
./src/scripts/inject_fts.sh
```

> [!NOTE]
> You can update `SOURCE_DB` and `TARGET_DB` in the script to change the source
> & destination database.

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
