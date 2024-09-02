<div align="center">

  <h1>Bible Scraper</h1>

  <p>
    Scrape Bible
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
  <a href="https://github.com/v-bible/bible-scraper/blob/main/LICENSE">
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
- [Contributing](#wave-contributing)
  - [Code of Conduct](#scroll-code-of-conduct)
- [FAQ](#grey_question-faq)
- [License](#warning-license)
- [Contact](#handshake-contact)
- [Acknowledgements](#gem-acknowledgements)

<!-- About the Project -->

## :star2: About the Project

<!-- Features -->

### :dart: Features

- Scrape bible from [biblegateway.com](https://www.biblegateway.com/) and
  [bible.com](https://www.bible.com/). Current supports:
  - Verses (with poetry).
  - Footnotes.
  - Headings.
  - References.
  - Psalm metadata (like author, title, etc.).
- Progress logging.
- Save to Postgres database.

<!-- Env Variables -->

### :key: Environment Variables

To run this project, you will need to add the following environment variables to
your `.env` file:

- **App configs:**

  `DB_URL`: Postgres database connection URL.

  `LOG_LEVEL`: Log level.

E.g:

```
# .env
DB_URL="postgres://postgres:postgres@localhost:5432/bible"
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

```bash
pnpm prisma:migrate
```

Generate Prisma client:

```bash
pnpm prisma:generate
```

<!-- Usage -->

## :eyes: Usage

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

- Scrape bible(from [ktcgkpv.org](https://ktcgkpv.org/bible?version=1)):

```bash
npx tsx ./src/ktcgkpv/main.ts
```

<!-- Contributing -->

## :wave: Contributing

<a href="https://github.com/v-bible/bible-scraper/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=v-bible/bible-scraper" />
</a>

Contributions are always welcome!

<!-- Code of Conduct -->

### :scroll: Code of Conduct

Please read the [Code of Conduct](https://github.com/v-bible/bible-scraper/blob/main/CODE_OF_CONDUCT.md).

<!-- FAQ -->

## :grey_question: FAQ

- Question 1

  - Answer 1.

- Question 2

  - Answer 2.

<!-- License -->

## :warning: License

Distributed under MIT license. See
[LICENSE](https://github.com/v-bible/bible-scraper/blob/main/LICENSE)
for more information.

<!-- Contact -->

## :handshake: Contact

Duong Vinh - [@duckymomo20012](https://twitter.com/duckymomo20012) -
tienvinh.duong4@gmail.com

Project Link: [https://github.com/v-bible/bible-scraper](https://github.com/v-bible/bible-scraper).

<!-- Acknowledgments -->

## :gem: Acknowledgements

Here are useful resources and libraries that we have used in our projects:

- [Bible.com](https://www.bible.com/): Bible.com website.
- [BibleGateway.com](https://www.biblegateway.com/): BibleGateway.com website.
