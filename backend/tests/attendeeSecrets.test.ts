import { describe, it, expect } from 'vitest';
import Agenda from '../src/models/Agenda';

const agendaData = {
  title: 'Geheim',
  attendees: [
    { id: 'anna', name: 'Anna', securityCode: '4711', secretGuid: 'guid-anna', isRegistered: true },
    { id: 'tom', name: 'Tom', isRegistered: false }
  ]
};

describe('Attendee secrets serialization', () => {
  it('JSON of an agenda never contains attendee secrets', () => {
    const json = JSON.stringify(new Agenda(agendaData));
    expect(json).not.toContain('securityCode');
    expect(json).not.toContain('secretGuid');
    expect(json).not.toContain('4711');
    expect(json).not.toContain('guid-anna');
    const parsed = JSON.parse(json);
    expect(parsed.attendees[0].isRegistered).toBe(true);
    expect(parsed.attendees[1].isRegistered).toBe(false);
  });

  it('keeps secrets on the document itself for server-side checks', () => {
    const agenda = new Agenda(agendaData);
    expect(agenda.attendees[0].securityCode).toBe('4711');
    expect(agenda.toObject().attendees[0].secretGuid).toBe('guid-anna');
  });
});
