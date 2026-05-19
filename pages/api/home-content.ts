import type { NextApiRequest, NextApiResponse } from 'next';
import { getFirebaseDb } from '../../lib/firebaseAdmin';

type Character = {
  name: string;
  desktopTitle: string;
  mobileTitle: string;
  text: string;
  tone: string;
};

type TimelineItem = {
  title: string;
  date: string;
  tone: string;
  content: string;
};

type HomeContentResponse = {
  characters: Character[];
  timeline: TimelineItem[];
};

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function toCharacter(data: FirebaseFirestore.DocumentData): Character | null {
  const character = {
    name: getString(data.name),
    desktopTitle: getString(data.desktopTitle),
    mobileTitle: getString(data.mobileTitle),
    text: getString(data.text),
    tone: getString(data.tone),
  };

  if (
    !character.name ||
    !character.desktopTitle ||
    !character.mobileTitle ||
    !character.text ||
    !character.tone
  ) {
    return null;
  }

  return character;
}

function toTimelineItem(data: FirebaseFirestore.DocumentData): TimelineItem | null {
  const item = {
    title: getString(data.title),
    date: getString(data.date),
    tone: getString(data.tone),
    content: getString(data.content),
  };

  if (!item.title || !item.date || !item.tone || !item.content) {
    return null;
  }

  return item;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HomeContentResponse | { error: string }>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const db = getFirebaseDb();

  if (!db) {
    res.status(503).json({ error: 'firebase_not_configured' });
    return;
  }

  try {
    const [charactersSnapshot, timelineSnapshot] = await Promise.all([
      db.collection('characters').orderBy('order', 'asc').get(),
      db.collection('timelineItems').orderBy('order', 'asc').get(),
    ]);

    const characters = charactersSnapshot.docs
      .map((doc) => toCharacter(doc.data()))
      .filter((character): character is Character => Boolean(character));
    const timeline = timelineSnapshot.docs
      .map((doc) => toTimelineItem(doc.data()))
      .filter((item): item is TimelineItem => Boolean(item));

    if (!characters.length || !timeline.length) {
      res.status(204).end();
      return;
    }

    res.status(200).json({
      characters,
      timeline,
    });
  } catch {
    res.status(500).json({ error: 'firebase_read_failed' });
  }
}
