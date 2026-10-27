// Example agendas for local development. Fixed ids make the seed idempotent: re-running replaces these
// documents and never touches anything else in the database.

export const SEED_AGENDA_IDS = [
  '65f000000000000000000001',
  '65f000000000000000000002',
  '65f000000000000000000003',
  '65f000000000000000000004'
];

export function isLocalMongoUri(uri: string): boolean {
  try {
    const host = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://')).hostname;
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  } catch {
    return false;
  }
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const NOTE_PREFIX = '📝 **Sitzungsnotiz / Beschluss:** ';

// Demo people; log in on the home page with the 4-digit security code
export const SEED_PEOPLE = {
  max: { id: 'seed-user-max', name: 'Max Mustermann', email: 'max@example.com', cardColor: '#0a4b7c', securityCode: '1111' },
  anna: { id: 'seed-user-anna', name: 'Anna Schmidt', email: 'anna@example.com', cardColor: '#8b0000', securityCode: '2222' },
  tom: { id: 'seed-user-tom', name: 'Tom Becker', cardColor: '#2f6b2f', securityCode: '3333' },
  lena: { id: 'seed-user-lena', name: 'Lena Wagner', email: 'lena@example.com', cardColor: '#6b21a8', securityCode: '4444' }
} as const;

type Person = (typeof SEED_PEOPLE)[keyof typeof SEED_PEOPLE];

const attendee = (person: Person, now: number, extra: Record<string, unknown> = {}) => ({
  ...person,
  secretGuid: `${person.id}-secret`,
  isRegistered: true,
  attendanceStatus: 'unconfirmed',
  joinedAt: new Date(now - 14 * DAY),
  lastSeen: new Date(now - 2 * HOUR),
  pinnedAchievements: [],
  ...extra
});

const systemItem = (systemKey: 'welcome' | 'next_meeting' | 'location', title: string, now: number) => ({
  title,
  systemKey,
  author: 'System',
  createdBy: 'system',
  pinned: true,
  completed: false,
  upvotes: [],
  createdAt: new Date(now - 7 * DAY),
  updatedAt: new Date(now - 7 * DAY)
});

const item = (author: Person, title: string, now: number, extra: Record<string, unknown> = {}) => ({
  title,
  author: author.name,
  createdBy: author.id,
  completed: false,
  pinned: false,
  upvotes: [],
  comments: [],
  durationSeconds: 0,
  createdAt: new Date(now - 5 * DAY),
  updatedAt: new Date(now - 5 * DAY),
  ...extra
});

const comment = (author: Person, id: string, text: string, createdAt: Date) => ({
  id,
  author: author.name,
  createdBy: author.id,
  text,
  attachments: [],
  reactions: [],
  createdAt
});

const audit = (action: string, user: string, details: string, timestamp: Date) => ({ action, user, details, timestamp });

export function buildSeedAgendas(now: number = Date.now()) {
  const { max, anna, tom, lena } = SEED_PEOPLE;
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  // 1) Upcoming regulars' table: standard items, poll, comments, markdown, pinned item
  const stammtisch = {
    _id: SEED_AGENDA_IDS[0],
    title: 'Stammtisch Oktober',
    date: iso(5 * DAY),
    location: { name: 'Brauhaus am Markt, Köln', lat: 50.9384, lng: 6.9599 },
    menuUrl: 'https://example.com/speisekarte',
    closeBeforeHours: 12,
    createdBy: max.id,
    includeStandardItems: true,
    sortMode: 'date',
    sortOrder: 'asc',
    attendees: [attendee(max, now), attendee(anna, now), attendee(tom, now), attendee(lena, now)],
    items: [
      systemItem('welcome', 'Begrüßung', now),
      systemItem('next_meeting', 'Neuer Termin', now),
      systemItem('location', 'Location', now),
      item(anna, 'Grillfest im Sommer planen', now, {
        description: 'Wer hat Lust, im **Juli** ein Grillfest zu organisieren?\n\n- Termin finden\n- Grill & Getränke\n- Wer bringt was mit?',
        pinned: true,
        upvotes: [max.id, tom.id, lena.id],
        poll: {
          question: 'Welches Wochenende passt?',
          allowMultiple: true,
          options: [
            { id: 'opt-1', text: '12./13. Juli', votes: [max.id, anna.id] },
            { id: 'opt-2', text: '19./20. Juli', votes: [tom.id] },
            { id: 'opt-3', text: '26./27. Juli', votes: [] }
          ]
        },
        comments: [
          comment(tom, 'seed-c-1', 'Ich kann meinen Gasgrill mitbringen.', new Date(now - 3 * DAY)),
          comment(lena, 'seed-c-2', 'Super Idee! Ich mache Salate.', new Date(now - 2 * DAY))
        ]
      }),
      item(max, 'Vereinskasse: Stand und Ausblick', now, {
        description: 'Kurzer Bericht zum Kassenstand und Vorschlag für den Jahresbeitrag.',
        upvotes: [anna.id]
      }),
      item(lena, 'Neue Mitglieder vorstellen', now, { upvotes: [max.id, anna.id] }),
      item(tom, 'Ausflug ins Phantasialand?', now, {
        description: 'Gruppenrabatt ab 10 Personen. Interesse bitte per Daumen hoch zeigen.',
        upvotes: [lena.id]
      })
    ],
    auditLogs: [audit('Agenda erstellt', max.name, 'Agenda "Stammtisch Oktober" wurde erstellt.', new Date(now - 14 * DAY))]
  };

  // 2) Finished retrospective: completed live meeting, durations, protocol notes
  const sessionStart = now - 6 * DAY;
  const retro = {
    _id: SEED_AGENDA_IDS[1],
    title: 'Team-Retro Sprint 42',
    date: iso(-6 * DAY),
    location: { name: 'Büro Ehrenfeld, Besprechungsraum 2', lat: 50.9497, lng: 6.9165 },
    createdBy: anna.id,
    liveMeetingActive: false,
    liveMeetingStatus: 'completed',
    liveMeetingPhase: 'summary',
    liveMeetingElapsedSeconds: 2460,
    liveMeetingPaused: true,
    attendees: [
      attendee(anna, now, { attendanceStatus: 'present' }),
      attendee(max, now, { attendanceStatus: 'present' }),
      attendee(lena, now, { attendanceStatus: 'absent' })
    ],
    items: [
      item(anna, 'Was lief gut?', now, {
        completed: true,
        durationSeconds: 540,
        upvotes: [max.id],
        comments: [comment(anna, 'seed-n-1', `${NOTE_PREFIX}Pairing beibehalten, Deployments laufen stabil.`, new Date(sessionStart + 10 * 60 * 1000))]
      }),
      item(max, 'Was können wir verbessern?', now, {
        completed: true,
        durationSeconds: 1020,
        upvotes: [anna.id, lena.id],
        description: 'Code-Reviews dauern zu lange, Tickets sind oft unklar.',
        comments: [comment(anna, 'seed-n-2', `${NOTE_PREFIX}Review-Slot täglich 14 Uhr, Tickets brauchen Akzeptanzkriterien.`, new Date(sessionStart + 30 * 60 * 1000))]
      }),
      item(lena, 'Action Items', now, { completed: true, durationSeconds: 600, pinned: true }),
      item(max, 'Tooling: neues CI ausprobieren', now, { completed: false, durationSeconds: 0 })
    ],
    auditLogs: [audit('Agenda erstellt', anna.name, 'Agenda "Team-Retro Sprint 42" wurde erstellt.', new Date(now - 10 * DAY))]
  };

  // 3) Live meeting in progress (title with ß): shows the live banner and the presentation
  const streetFestival = {
    _id: SEED_AGENDA_IDS[2],
    title: 'Vereinssitzung Straßenfest',
    date: iso(-30 * 60 * 1000),
    location: { name: 'Vereinsheim, Lindenstraße 12', lat: 50.9333, lng: 6.95 },
    createdBy: tom.id,
    includeStandardItems: true,
    liveMeetingActive: true,
    liveMeetingStatus: 'in_progress',
    liveMeetingPhase: 'agenda_items',
    liveMeetingCurrentItemIndex: 3,
    liveMeetingElapsedSeconds: 900,
    liveMeetingCurrentItemElapsedSeconds: 120,
    liveMeetingPaused: false,
    liveMeetingStartedAt: new Date(now - 60 * 1000),
    liveMeetingItemStartedAt: new Date(now - 60 * 1000),
    attendees: [
      attendee(tom, now, { attendanceStatus: 'present' }),
      attendee(max, now, { attendanceStatus: 'present' }),
      attendee(anna, now, { attendanceStatus: 'present' }),
      attendee(lena, now, { attendanceStatus: 'absent' })
    ],
    items: [
      { ...systemItem('welcome', 'Begrüßung', now), completed: true, durationSeconds: 180 },
      { ...systemItem('next_meeting', 'Neuer Termin', now), completed: true, durationSeconds: 240 },
      { ...systemItem('location', 'Location', now), completed: true, durationSeconds: 120 },
      item(tom, 'Standplan und Genehmigung', now, {
        description: 'Die Genehmigung der Stadt liegt vor. Offen: **Stromanschluss** für den Getränkestand.',
        upvotes: [max.id, anna.id]
      }),
      item(anna, 'Helferliste', now, {
        poll: {
          question: 'Wer übernimmt den Aufbau am Freitag?',
          options: [
            { id: 'h-1', text: 'Ich', votes: [anna.id, max.id] },
            { id: 'h-2', text: 'Nur am Samstag', votes: [tom.id] }
          ]
        }
      }),
      item(max, 'Budget Musik & Technik', now)
    ],
    auditLogs: [audit('Agenda erstellt', tom.name, 'Agenda "Vereinssitzung Straßenfest" wurde erstellt.', new Date(now - 20 * DAY))]
  };

  // 4) Closed agenda (deadline passed) with a pending item transfer
  const grillabend = {
    _id: SEED_AGENDA_IDS[3],
    title: 'Grillabend Planung',
    date: iso(6 * HOUR),
    location: { name: 'Rheinpark, Grillwiese', lat: 50.9443, lng: 6.9781 },
    closeBeforeHours: 12,
    createdBy: lena.id,
    attendees: [attendee(lena, now), attendee(max, now), attendee(tom, now)],
    items: [
      item(lena, 'Einkaufsliste', now, { pinned: true, upvotes: [max.id, tom.id] }),
      item(tom, 'Grill reinigen und mitbringen', now, {
        transferredTo: {
          fromUserId: tom.id,
          fromUserName: tom.name,
          toUserId: max.id,
          toUserName: max.name,
          status: 'pending',
          transferredAt: new Date(now - DAY)
        }
      }),
      item(max, 'Musikbox', now)
    ],
    auditLogs: [audit('Agenda erstellt', lena.name, 'Agenda "Grillabend Planung" wurde erstellt.', new Date(now - 4 * DAY))]
  };

  return [stammtisch, retro, streetFestival, grillabend];
}
