-- AlterTable
ALTER TABLE "book" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "book_chapter" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "book_footnote" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "book_heading" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "book_reference" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "book_verse" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "version" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "version_format" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "version_language" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

create or replace function set_updated_at_timestamp()
returns trigger as $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

create or replace trigger set_updated_at_timestamp_trigger
before update on "version"
for each row
execute procedure set_updated_at_timestamp();

create or replace trigger set_updated_at_timestamp_trigger
before update on "version_format"
for each row
execute procedure set_updated_at_timestamp();

create or replace trigger set_updated_at_timestamp_trigger
before update on "version_language"
for each row
execute procedure set_updated_at_timestamp();

create or replace trigger set_updated_at_timestamp_trigger
before update on "book"
for each row
execute procedure set_updated_at_timestamp();

create or replace trigger set_updated_at_timestamp_trigger
before update on "book_chapter"
for each row
execute procedure set_updated_at_timestamp();

create or replace trigger set_updated_at_timestamp_trigger
before update on "book_verse"
for each row
execute procedure set_updated_at_timestamp();

create or replace trigger set_updated_at_timestamp_trigger
before update on "book_footnote"
for each row
execute procedure set_updated_at_timestamp();

create or replace trigger set_updated_at_timestamp_trigger
before update on "book_heading"
for each row
execute procedure set_updated_at_timestamp();

create or replace trigger set_updated_at_timestamp_trigger
before update on "book_reference"
for each row
execute procedure set_updated_at_timestamp();
