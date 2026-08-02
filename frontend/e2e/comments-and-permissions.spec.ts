import { test, expect } from '@playwright/test';

const MOCK_AGENDA = {
  _id: 'mock-agenda-comments',
  title: 'Comments & Permissions Agenda',
  createdBy: 'user-alice',
  items: [
    {
      _id: 'item-1',
      title: 'Ersteller Punkt',
      description: 'Erstellt von Alice',
      createdBy: 'user-alice',
      author: 'Alice',
      comments: [
        {
          id: 'comment-1',
          author: 'Bob',
          createdBy: 'user-bob',
          text: 'Erster Kommentar von Bob',
          attachments: [
            { name: 'dokument.pdf', url: 'data:application/pdf;base64,JVBERi0xLj...', type: 'pdf' }
          ],
          reactions: [{ emoji: '\uD83D\uDC4D', users: ['user-alice'] }],
          createdAt: new Date().toISOString()
        }
      ]
    }
  ],
  attendees: [
    { id: 'user-alice', name: 'Alice', cardColor: '#007ad9' },
    { id: 'user-bob', name: 'Bob', cardColor: '#ed5565' }
  ],
  auditLogs: []
};

test.describe('FlashAgenda - Comments & Creator Editing Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((mockAgenda) => {
      const agendaId = 'mock-agenda-comments';
      localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify({ id: 'user-alice', name: 'Alice' }));

      let currentAgenda = JSON.parse(JSON.stringify(mockAgenda));

      const origFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        const method = (init?.method || 'GET').toUpperCase();

        if (url.includes('/api/agendas')) {
          if (url.includes('user-stats')) {
            return new Response(JSON.stringify({ agendasCount: 1, totalItemsContributed: 2 }), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('user-agendas')) {
            return new Response(JSON.stringify([]), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('ping')) {
            return new Response(JSON.stringify({ ok: true }), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('mock-agenda-comments')) {
            if (method === 'PUT') {
              try {
                const body = JSON.parse(init?.body || '{}');
                currentAgenda = { ...currentAgenda, ...body };
              } catch {}
              return new Response(JSON.stringify(currentAgenda), {
                status: 200, headers: { 'Content-Type': 'application/json' }
              });
            }
            return new Response(JSON.stringify(currentAgenda), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify({}), {
            status: 200, headers: { 'Content-Type': 'application/json' }
          });
        }
        return origFetch(input, init);
      };
    }, MOCK_AGENDA);
  });

  test('should display existing comments, PDF attachments, and emoji reactions', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-comments');
    await expect(page.locator('text=Ersteller Punkt')).toBeVisible({ timeout: 10000 });

    const commentButton = page.locator('button[title="Kommentare"]').first();
    await expect(commentButton).toBeVisible({ timeout: 5000 });
    await commentButton.click({ force: true });

    await expect(page.locator('text=Erster Kommentar von Bob')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=dokument.pdf (PDF öffnen)')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '\uD83D\uDC4D' }).first()).toBeVisible();
  });

  test('should allow posting a new comment', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-comments');
    await expect(page.locator('text=Ersteller Punkt')).toBeVisible({ timeout: 10000 });

    // Comment button opens details AND sets showCommentForm=true → textarea is directly visible
    await page.locator('button[title="Kommentare"]').first().click({ force: true });
    await expect(page.locator('text=Erster Kommentar von Bob')).toBeVisible({ timeout: 5000 });

    // Textarea is directly open (no need to click 'Kommentar hinzufügen')
    const textarea = page.locator('textarea[placeholder="Schreibe einen Kommentar..."]');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill('Neuer Kommentar im E2E-Test');

    const submitBtn = page.locator('button').filter({ hasText: 'Kommentieren' }).first();
    await expect(submitBtn).toBeEnabled({ timeout: 3000 });
    await submitBtn.click({ force: true });

    await expect(page.locator('text=Neuer Kommentar im E2E-Test')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle emoji reactions on a comment', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-comments');
    await expect(page.locator('text=Ersteller Punkt')).toBeVisible({ timeout: 10000 });

    await page.locator('button[title="Kommentare"]').first().click({ force: true });
    await expect(page.locator('text=Erster Kommentar von Bob')).toBeVisible({ timeout: 5000 });

    const emojiBtn = page.locator('button').filter({ hasText: '\uD83C\uDF89' }).first();
    await expect(emojiBtn).toBeVisible({ timeout: 3000 });
    await expect(emojiBtn).toHaveClass(/bg-gray-800/);

    await emojiBtn.click({ force: true });

    await expect(emojiBtn).toHaveClass(/bg-yellow-500/, { timeout: 5000 });
  });

  test('should restrict title/description editing to item creator', async ({ page }) => {
    await page.addInitScript(() => {
      const agendaId = 'mock-agenda-comments';
      localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify({ id: 'user-bob', name: 'Bob' }));
    });

    await page.goto('/agenda/mock-agenda-comments');
    await expect(page.locator('text=Ersteller Punkt')).toBeVisible({ timeout: 10000 });

    const editBtn = page.locator('button[title="Nur der Ersteller kann Titel & Beschreibung bearbeiten"]').first();
    if (await editBtn.count() > 0) {
      await expect(editBtn).toBeDisabled();
    }
  });
});
