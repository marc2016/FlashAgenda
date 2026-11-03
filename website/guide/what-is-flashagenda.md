# What is FlashAgenda?

FlashAgenda is a self-hosted web app for collaborative meeting agendas. You create an agenda, share a link, and everyone adds the topics they want to talk about. When the meeting starts, a live mode guides you through the topics, tracks time and records decisions.

It is built for regulars' tables, club meetings, team retrospectives and any group that meets regularly and wants a shared list of topics without setting up accounts.

## How it works

1. **Create an agenda** on the start page. It gets a title, a date, a place and an optional menu link.
2. **Share it** via link or QR code. People open it, pick their name or add themselves, and can add topics right away.
3. **Collect topics** until the cut-off: by default, new topics are closed 12 hours before the meeting.
4. **Run the meeting** in live mode: roll call, topic by topic with timers, decisions per topic, and a protocol at the end.
5. **Plan the next one**: start a follow-up agenda with the same people and the pinned topics.

## Features

- **No accounts.** People are recognised per device. A personal 4-digit code shown on your person card lets you sign in on another device.
- **Topics with substance.** Markdown descriptions, images, polls, thumbs-up votes, comments with emoji reactions and PDF attachments.
- **Organise.** Pin important topics, sort by date, votes or randomly, and hand a topic over to someone else, who confirms or declines it.
- **Standard topics.** Optionally start every agenda with "Welcome", "Next date" and "Location".
- **Live meeting.** Roll call, a timer per topic and for the whole session, pause and resume, decisions and a Markdown protocol to copy or download. Every device stays in sync.
- **Real time.** Changes appear instantly for everyone, including who is online right now.
- **Achievements.** Personal achievements and rotating trophies per agenda add a bit of fun.
- **Installable and offline-ready.** FlashAgenda is a PWA; changes made offline are queued and synced later.
- **Calendar and notifications.** Export to `.ics` and opt in to browser notifications.
- **Admin area.** An overview of all agendas, protected by a password.

## Under the hood

FlashAgenda consists of a React frontend, a Node.js/Express backend with Socket.io for real-time updates, and MongoDB for storage. All three run as Docker containers. See [Getting Started](./getting-started) to run your own instance.

::: info Language
The app interface is currently in German. This documentation is in English.
:::
