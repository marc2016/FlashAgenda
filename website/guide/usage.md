# Using FlashAgenda

A quick tour of what you can do with an agenda. The app interface is in German; the German labels are shown in quotes.

## Create and share an agenda

Click the start button on the home page. You become the creator of the new agenda and can set its title, date, place ("Ort") and a link to the menu ("Speisekarte").

Share the agenda with the share, copy or QR code buttons in the action bar at the top. Everyone with the link can join.

## People and signing in

When people open an agenda for the first time, they pick their name or add themselves. FlashAgenda remembers them on that device, so there is no account and no password.

Each person card shows a personal 4-digit code. Enter it on the home page ("Code") to sign in as the same person on another device. Cards can get a colour and a profile picture.

## Topics

Add a topic with the yellow plus button. A topic can have:

- a description in Markdown and images,
- a poll with one or several answers,
- thumbs-up votes ("Daumen hoch"),
- comments with emoji reactions and PDF attachments.

Pin important topics so they stay in place when sorting, and sort by date, by votes or randomly. If someone else should take over a topic, hand it over; the recipient confirms or declines it.

New topics can be added until the cut-off ("Schluss"), by default 12 hours before the meeting. The creator can change the cut-off or close and reopen the agenda manually.

### Standard topics

Turn on "Standardpunkte" in the details to start the agenda with "Welcome", "Next date" and "Location" ("Begrüßung", "Neuer Termin", "Location"). They belong to the system user and always stay at the top.

## Sections

The agenda page has four sections: details, people, achievements and topics. Click a heading or the arrow to collapse a section; collapsed sections show a short summary. Your browser remembers the layout for all agendas.

## Live meeting

Start the meeting with "Sitzung starten". The live mode walks you through:

1. **Roll call**: mark who is present or absent, person by person or on an overview.
2. **Topics**: one topic at a time with its description, poll and comments, a timer per topic and for the whole meeting. Record decisions as notes, pin topics, pause and resume.
3. **Summary**: duration, discussed topics and attendance, plus the time spent per topic.

Everyone who opens the agenda during the meeting joins the live view automatically and follows along.

At the end you can copy or download the protocol as Markdown, and start a follow-up agenda ("Neue Agenda vorbereiten") with the same people and all pinned topics.

## Achievements

Personal achievements and rotating trophies ("Wanderpokale") reward active participation, for example for adding topics, commenting or voting.

## Admin area

The admin area at `/admin` lists all agendas of the instance. It is protected by the admin password, see [Configuration](./configuration).
