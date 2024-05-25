<div align="center">

  <h1>Scraping bible</h1>

  <p>
    Scraping bible from various sources
  </p>

</div>

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

> [!NOTE]
> In some cases, the error `code: 'ETIMEDOUT', syscall: 'read'` might occur.
> However, I don't get this error when I keep browsing.
