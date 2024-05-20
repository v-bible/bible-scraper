<div align="center">

  <h1>Scraping bible</h1>

  <p>
    Scraping biblegateway
  </p>

<br />

## Getting started

Go to the app directory:

```bash
cd apps/bible
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

## Scripts

Scrap versions:

```bash
npx tsx ./src/get-version.ts
```

Scrap books:

```bash
npx tsx ./src/get-book.ts
```

Scrap verses:

```bash
npx tsx ./src/get-verse.ts
```
