# Contributing to This Project

Thank you for your interest in contributing! 🎉 This project is open to improvements and collaboration. Please follow the guidelines below to ensure a smooth contribution process.

## 🚀 How to Contribute

1. **Fork** the repository.
2. **Clone** your fork:
   ```sh
   git clone https://github.com/your-username/repository-name.git
   ```
3. **Create a new branch** for your changes:
   ```sh
   git checkout -b feature-or-bugfix-name
   ```
4. **Make your changes** and commit them:
   ```sh
   git commit -m "Add a meaningful commit message"
   ```
5. **Push to your fork**:
   ```sh
   git push origin feature-or-bugfix-name
   ```
6. **Create a Pull Request (PR)** on GitHub and provide a clear description of your changes.

## 📌 Contribution Guidelines

### The Basics

- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) (if applicable).
- Keep pull requests **small and focused**.
- Write **clear commit messages** that explain the changes made.
- Document changes where necessary (e.g., update the README if applicable).
- Ensure **compatibility** with the project's existing setup.
- **Run tests** before submitting a PR, if applicable.

### Scrape Process

When you add a new scraper for a new website, follow these guidelines:

#### Folder structure

> [!NOTE]
> It's advisable to write the scraper in TypeScript for better type checking.

- `get-all.ts`: Contains the main script to scrape all verses from a given book
  chapter.

- `get-book.ts`: Get all available books from the website.

- `get-paragraph.ts`: Verses should be split into paragraphs to maintain the original
  structure of the text. Like which verses are in the same paragraph in the
  original text.

- `get-psalm-meta.ts`: Get the metadata of a psalm.

- `get-version.ts`: Get all available versions of the Bible from the website.

- `insert-data.ts`: Insert the scraped data into the database using Prisma or any
  other ORM.

- `main.ts`: Contains the main function to run the scraper.

Example structure:

```
src
└── new-domain
    ├── get-all.ts
    ├── get-book.ts
    ├── get-paragraph.ts
    ├── get-psalm-meta.ts
    ├── get-version.ts
    ├── insert-data.ts
    └── main.ts
```

#### Database Schema

- Any breaking changes to the database schema should be discussed before making
  the changes.

- All domains MUST be support new changes to the database schema, to ensure
  consistency across all domains.

- Currently we have two Prisma schema for `pgsql` and `sqlite`, so any changes
  to the schema should be reflected in both schemas.

#### Process Data

> [!NOTE]
> DON'T just focus on verse number to process data, please ensure **the content
> integrity is the first priority**.

Currently, we are extracting contents using regular expressions using
`VerseProcessor` from `lib/verse-utils`.

These conventions are applied as modifying HTML contents before we parsing HTML
into Markdown parser. After that we pass it to `VerseProcessor`.

**Conventions**:

- **Verse numbers**: Wrap the number with `$`. E.g.: `$1$`, `$2$`, etc.
- **Cross references**: Wrap content or characters with `@$`. E.g.: `@$Jn
1:1$@`.
- **Footnotes**: Wrap number or characters with `<$` and `$>`. E.g.: `<$1$>`.
- **Headings**: Non heading elements MUST be replaced with headings elements.
  E.g.: `h1`, `h2`, `h3`, etc.
- **Words of Jesus**: Wrap with `b` element. E.g.: `<b>Jesus</b>`.
- **Poetry**: Add `~` at the beginning of the line. E.g.: `~This is a poetry`.
- **Paragraph**: Wrap with `p` element. E.g.: `<p>This is a paragraph</p>`.

> [!NOTE]
> You can also choose new conventions to pass to the `VerseProcessor`.

#### Insert Data

It's advisable that data should be inserted as `upsert` to avoid duplicate data
for **idempotent operation**.

#### Logging

Every steps of the scraping process should be logged to track the process.

## 🛠 Issue Reporting

- **Search before posting**: Check if the issue has already been reported.
- **Provide detailed information**: Include steps to reproduce, screenshots (if applicable), and expected behavior.
- **Suggest possible fixes** if you have any ideas.
- Use **clear and concise titles** for new issues.

## 📝 Code Style & Standards

### The Basics

- Follow the existing **coding style**.
- Use **meaningful variable and function names**.
- Format code **consistently**.
- Write **self-explanatory** and **well-structured** code.

## 💬 Need Help?

If you have any questions or need guidance, feel free to:

- **Open an issue** on GitHub.
- Join the **discussions** section to engage with the community.

We appreciate your contributions! 🎉

```

```
