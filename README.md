<div align="center">

  <h1>Scraping</h1>

  <p>
    Scraping stuffs
  </p>

<!-- Badges -->
<p>
  <a href="https://github.com/v-bible/scraping/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/v-bible/scraping" alt="contributors" />
  </a>
  <a href="">
    <img src="https://img.shields.io/github/last-commit/v-bible/scraping" alt="last update" />
  </a>
  <a href="https://github.com/v-bible/scraping/network/members">
    <img src="https://img.shields.io/github/forks/v-bible/scraping" alt="forks" />
  </a>
  <a href="https://github.com/v-bible/scraping/stargazers">
    <img src="https://img.shields.io/github/stars/v-bible/scraping" alt="stars" />
  </a>
  <a href="https://github.com/v-bible/scraping/issues/">
    <img src="https://img.shields.io/github/issues/v-bible/scraping" alt="open issues" />
  </a>
  <a href="https://github.com/v-bible/scraping/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/v-bible/scraping.svg" alt="license" />
  </a>
</p>

<h4>
    <a href="https://github.com/v-bible/scraping/">View Demo</a>
  <span> · </span>
    <a href="https://github.com/v-bible/scraping">Documentation</a>
  <span> · </span>
    <a href="https://github.com/v-bible/scraping/issues/">Report Bug</a>
  <span> · </span>
    <a href="https://github.com/v-bible/scraping/issues/">Request Feature</a>
  </h4>
</div>

<br />

<!-- Table of Contents -->

# :notebook_with_decorative_cover: Table of Contents

- [About the Project](#star2-about-the-project)
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
git clone https://github.com/v-bible/scraping.git
```

Go to the project directory:

```bash
cd scraping
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

Scrap bible (from [biblegateway.com](https://www.biblegateway.com/)):

```bash
npx tsx ./src/biblegateway/main.ts
```

Scrap bible (from [bible.com](https://www.bible.com/)):

```bash
npx tsx ./src/bibledotcom/main.ts
```

> [!NOTE]
> To prevent the error `net::ERR_NETWORK_CHANGED`, you can temporarily disable
> the ipv6 on your network adapter:
>
> ```bash
> sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
> sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1
> ```

<!-- Contributing -->

## :wave: Contributing

<a href="https://github.com/v-bible/scraping/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=v-bible/scraping" />
</a>

Contributions are always welcome!

<!-- Code of Conduct -->

### :scroll: Code of Conduct

Please read the [Code of Conduct](https://github.com/v-bible/scraping/blob/main/CODE_OF_CONDUCT.md).

<!-- FAQ -->

## :grey_question: FAQ

- Question 1

  - Answer 1.

- Question 2

  - Answer 2.

<!-- License -->

## :warning: License

Distributed under MIT license. See
[LICENSE](https://github.com/v-bible/scraping/blob/main/LICENSE)
for more information.

<!-- Contact -->

## :handshake: Contact

Duong Vinh - [@duckymomo20012](https://twitter.com/duckymomo20012) -
tienvinh.duong4@gmail.com

Project Link: [https://github.com/v-bible/scraping](https://github.com/v-bible/scraping).

<!-- Acknowledgments -->

## :gem: Acknowledgements

Here are useful resources and libraries that we have used in our projects:

- [Awesome Readme Template](https://github.com/Louis3797/awesome-readme-template):
  A detailed template to bootstrap your README file quickly.
