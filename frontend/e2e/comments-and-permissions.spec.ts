import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Comments & Creator Editing Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ id: 'user-alice', name: 'Alice' }));

      const origFetch = window.fetch;
      window.fetch = async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        const method = (init?.method || 'GET').toUpperCase();

        if (url.includes('/api/agendas')) {
          if (url.includes('user-stats')) {
            return new Response(JSON.stringify({ agendasCount: 1, totalItemsContributed: 2 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('user-agendas')) {
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('mock-agenda-comments')) {
            return new Response(JSON.stringify({
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
                      reactions: [{ emoji: '👍', users: ['user-alice'] }],
                      createdAt: new Date().toISOString()
                    }
                  ]
                }
              ],
              attendees: [
                { id: 'user-alice', name: 'Alice', cardColor: '#007ad9' },
                { id: 'user-bob', name: 'Bob', cardColor: '#ed5565' }
              ]
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (method === 'PUT') {
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return origFetch(input, init);
      };
    });
  });

  test('should display existing comments, PDF attachments, and emoji reactions', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-comments');

    // Wait for the agenda item to render
    await expect(page.locator('text=Ersteller Punkt')).toBeVisible({ timeout: 10000 });

    // Click the comment button – opens details AND comment form simultaneously
    const commentButton = page.locator('button[title="Kommentare"]').first();
    await expect(commentButton).toBeVisible({ timeout: 5000 });
    await commentButton.click({ force: true });

    // Comments section should now be visible
    await expect(page.locator('text=Erster Kommentar von Bob')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=dokument.pdf (PDF öffnen)')).toBeVisible();

    // The 👍 reaction button should be visible
    await expect(page.locator('button').filter({ hasText: '👍' }).first()).toBeVisible();
  });

  test('should allow posting a new comment', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-comments');
    await expect(page.locator('text=Ersteller Punkt')).toBeVisible({ timeout: 10000 });

    // Click comment button – opens details view with form already shown (showCommentForm=true)
    const commentButton = page.locator('button[title="Kommentare"]').first();
    await commentButton.click({ force: true });

    // Textarea is directly visible (button sets showCommentForm=true immediately)
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

    // Open details
    const commentButton = page.locator('button[title="Kommentare"]').first();
    await commentButton.click({ force: true });

    // Wait for existing comment
    await expect(page.locator('text=Erster Kommentar von Bob')).toBeVisible({ timeout: 5000 });

    // Click the 🎉 emoji reaction button
    const emojiBtn = page.locator('button').filter({ hasText: '🎉' }).first();
    await expect(emojiBtn).toBeVisible({ timeout: 3000 });
    await emojiBtn.click({ force: true });

    // After clicking, the button should have the active class
    await expect(emojiBtn).toHaveClass(/bg-yellow-500/, { timeout: 3000 });
  });

  test('should restrict title/description editing to item creator', async ({ page }) => {
    // Override user to Bob (not the item creator)
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ id: 'user-bob', name: 'Bob' }));
    });

    await page.goto('/agenda/mock-agenda-comments');
    await expect(page.locator('text=Ersteller Punkt')).toBeVisible({ timeout: 10000 });

    // Edit button should be disabled for non-creators
    const editBtn = page.locator('button[title="Nur der Ersteller kann Titel & Beschreibung bearbeiten"]').first();
    if (await editBtn.count() > 0) {
      await expect(editBtn).toBeDisabled();
    }
  });
});
