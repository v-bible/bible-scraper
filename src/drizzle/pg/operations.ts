import { and, eq } from 'drizzle-orm';
import {
  type Heading,
  type NewHeading,
  type NewMark,
  type NewVerse,
  type Verse,
  heading,
  mark,
  verse,
} from '@/../drizzle/pg/schema.js';
import { type DrizzleClient } from '@/drizzle/pg/index.js';

// Upsert operations for Drizzle PostgreSQL

export async function upsertVerse(
  db: DrizzleClient,
  data: Omit<NewVerse, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Verse> {
  const existingVerse = await db
    .select()
    .from(verse)
    .where(
      and(
        eq(verse.number, data.number),
        eq(verse.subVerseIndex, data.subVerseIndex ?? 0),
        eq(verse.chapterId, data.chapterId),
      ),
    )
    .limit(1);

  if (existingVerse.length > 0) {
    // Update existing verse
    await db
      .update(verse)
      .set({
        text: data.text,
        paragraphNumber: data.paragraphNumber ?? 0,
        paragraphIndex: data.paragraphIndex ?? 0,
        isPoetry: data.isPoetry ?? false,
        label: data.label,
        audioUrl: data.audioUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(verse.id, existingVerse[0]!.id));

    return {
      ...existingVerse[0]!,
      text: data.text,
      paragraphNumber: data.paragraphNumber ?? 0,
      paragraphIndex: data.paragraphIndex ?? 0,
      isPoetry: data.isPoetry ?? false,
      label: data.label,
      audioUrl: data.audioUrl ?? null,
      updatedAt: new Date(),
    };
  }

  // Insert new verse
  const newVerse: NewVerse = {
    ...data,
    subVerseIndex: data.subVerseIndex ?? 0,
    paragraphNumber: data.paragraphNumber ?? 0,
    paragraphIndex: data.paragraphIndex ?? 0,
    isPoetry: data.isPoetry ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const insertedVerse = await db.insert(verse).values(newVerse).returning();
  return insertedVerse[0]!;
}

export async function upsertHeading(
  db: DrizzleClient,
  data: Omit<NewHeading, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Heading> {
  const existingHeading = await db
    .select()
    .from(heading)
    .where(
      and(
        eq(heading.sortOrder, data.sortOrder ?? 0),
        eq(heading.verseId, data.verseId),
      ),
    )
    .limit(1);

  if (existingHeading.length > 0) {
    // Update existing heading
    await db
      .update(heading)
      .set({
        text: data.text,
        level: data.level ?? 1,
        updatedAt: new Date(),
      })
      .where(eq(heading.id, existingHeading[0]!.id));

    return {
      ...existingHeading[0]!,
      text: data.text,
      level: data.level ?? 1,
      updatedAt: new Date(),
    };
  }

  // Insert new heading
  const newHeading: NewHeading = {
    ...data,
    level: data.level ?? 1,
    sortOrder: data.sortOrder ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const insertedHeading = await db
    .insert(heading)
    .values(newHeading)
    .returning();
  return insertedHeading[0]!;
}

export async function upsertMark(
  db: DrizzleClient,
  data: Omit<NewMark, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  const existingMark = await db
    .select()
    .from(mark)
    .where(
      and(
        eq(mark.sortOrder, data.sortOrder ?? 0),
        eq(mark.targetId, data.targetId),
        eq(mark.kind, data.kind ?? 'FOOTNOTE'),
      ),
    )
    .limit(1);

  if (existingMark.length > 0) {
    // Update existing mark
    await db
      .update(mark)
      .set({
        label: data.label,
        content: data.content,
        startOffset: data.startOffset,
        endOffset: data.endOffset,
        targetType: data.targetType,
        updatedAt: new Date(),
      })
      .where(eq(mark.id, existingMark[0]!.id));
  } else {
    // Insert new mark
    const newMark: NewMark = {
      ...data,
      kind: data.kind ?? 'FOOTNOTE',
      sortOrder: data.sortOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(mark).values(newMark);
  }
}
