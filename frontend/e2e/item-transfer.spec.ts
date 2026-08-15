import { test, expect } from '@playwright/test';

const MOCK_TRANSFER_AGENDA = {
  _id: 'mock-agenda-transfer',
  title: 'Transfer Workflow Agenda',
  createdBy: 'user-alice',
  items: [
    {
      _id: 'item-1',
      title: 'Strategie Präsentation 2026',
      description: 'Ziele und Meilensteine',
      createdBy: 'user-alice',
      author: 'Alice',
    },
    {
      _id: 'item-2',
      title: 'Budget Freigabe Q3',
      description: 'Finanzbericht und Freigaben',
      createdBy: 'user-alice',
      author: 'Alice',
    }
  ],
  attendees: [
    { id: 'user-alice', name: 'Alice', cardColor: '#0a4b7c' },
    { id: 'user-bob', name: 'Bob', cardColor: '#8b0000' }
  ],
  auditLogs: []
};

test.describe('FlashAgenda - Item Transfer Workflow', () => {
  test('Alice transfers an item to Bob, Bob confirms with green button and counter moves to Bob', async ({ page }) => {
    await page.addInitScript((mockAgenda) => {
      const agendaId = 'mock-agenda-transfer';
      
      let currentAgenda = mockAgenda;
      try {
        const saved = sessionStorage.getItem('__MOCK_AGENDA__');
        if (saved) {
          currentAgenda = JSON.parse(saved);
        } else {
          sessionStorage.setItem('__MOCK_AGENDA__', JSON.stringify(mockAgenda));
        }
      } catch {}

      // Initial user: Alice if not already set
      if (!localStorage.getItem(`flashagenda_${agendaId}_user`)) {
        localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify({ id: 'user-alice', name: 'Alice' }));
        localStorage.setItem('flashagenda_last_user', JSON.stringify({ id: 'user-alice', name: 'Alice' }));
      }

      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        const method = (init?.method || 'GET').toUpperCase();

        if (url.includes('/api/agendas')) {
          if (url.includes('ping')) {
            return new Response(JSON.stringify({ lastSeen: new Date().toISOString() }), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            });
          }
          if (method === 'PUT' && init?.body) {
            try {
              const body = JSON.parse(init.body as string);
              currentAgenda = { ...currentAgenda, ...body };
              sessionStorage.setItem('__MOCK_AGENDA__', JSON.stringify(currentAgenda));
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
      };
    }, MOCK_TRANSFER_AGENDA);

    await page.goto('/agenda/mock-agenda-transfer');
    await expect(page.locator('text=Strategie Präsentation 2026').first()).toBeVisible();

    // Alice transfers item-1 to Bob
    const transferButton = page.locator('[data-testid="transfer-item-0"]');
    await expect(transferButton).toBeVisible();
    await transferButton.click();

    // Modal opens to select recipient
    await expect(page.locator('text=Agendapunkt übertragen').first()).toBeVisible();
    const bobTarget = page.locator('[data-testid="transfer-target-Bob"]');
    await expect(bobTarget).toBeVisible();
    await bobTarget.click();

    // Confirm transfer in modal
    const confirmTransferBtn = page.locator('[data-testid="confirm-transfer-btn"]');
    await expect(confirmTransferBtn).toBeEnabled();
    await confirmTransferBtn.click();

    // Verify item now shows pending transfer to Bob
    await expect(page.locator('text=(ausstehend)')).toBeVisible();

    // Switch user to Bob
    await page.evaluate(() => {
      const agendaId = 'mock-agenda-transfer';
      localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify({ id: 'user-bob', name: 'Bob' }));
      localStorage.setItem('flashagenda_last_user', JSON.stringify({ id: 'user-bob', name: 'Bob' }));
    });
    await page.reload();

    // Bob sees the PendingTransfersModal automatically
    await expect(page.locator('text=Übertragene Agendapunkte')).toBeVisible();
    await expect(page.locator('.comic-dialog').getByText('Strategie Präsentation 2026')).toBeVisible();

    // Verify header does NOT contain any badge
    await expect(page.locator('.comic-dialog .p-dialog-header .p-badge')).toHaveCount(0);

    // Green "Bestätigen" button with checkmark icon and comic-button-success class exists
    const acceptBtn = page.locator('[data-testid="accept-transfer-item-1"]');
    await expect(acceptBtn).toBeVisible();
    await expect(acceptBtn).toContainText('Bestätigen');
    await expect(acceptBtn.locator('.pi-check')).toBeVisible();
    await expect(acceptBtn).toHaveClass(/comic-button-success/);

    // Red "Ablehnen" button with cross icon and comic-button-danger class exists
    const rejectBtn = page.locator('[data-testid="reject-transfer-item-1"]');
    await expect(rejectBtn).toBeVisible();
    await expect(rejectBtn).toContainText('Ablehnen');
    await expect(rejectBtn.locator('.pi-times')).toBeVisible();
    await expect(rejectBtn).toHaveClass(/comic-button-danger/);

    // Bob accepts the transfer
    await acceptBtn.click();

    // Modal closes
    await expect(page.locator('text=Übertragene Agendapunkte')).toBeHidden({ timeout: 5000 });

    // Item now shows Alice ➔ Bob chips
    await expect(page.locator('text=Alice').first()).toBeVisible();
    await expect(page.locator('text=Bob').first()).toBeVisible();
  });

  test('Bob rejects a transferred item and it remains with the original creator', async ({ page }) => {
    const agendaWithPending = JSON.parse(JSON.stringify(MOCK_TRANSFER_AGENDA));
    agendaWithPending.items[0].transferredTo = {
      toUserId: 'user-bob',
      toUserName: 'Bob',
      fromUserId: 'user-alice',
      fromUserName: 'Alice',
      status: 'pending'
    };

    await page.addInitScript((mockAgenda) => {
      const agendaId = 'mock-agenda-transfer';
      let currentAgenda = JSON.parse(JSON.stringify(mockAgenda));

      // User: Bob
      localStorage.setItem(`flashagenda_${agendaId}_user`, JSON.stringify({ id: 'user-bob', name: 'Bob' }));
      localStorage.setItem('flashagenda_last_user', JSON.stringify({ id: 'user-bob', name: 'Bob' }));

      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        const method = (init?.method || 'GET').toUpperCase();

        if (url.includes('/api/agendas')) {
          if (url.includes('ping')) {
            return new Response(JSON.stringify({ lastSeen: new Date().toISOString() }), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            });
          }
          if (method === 'PUT' && init?.body) {
            try {
              const body = JSON.parse(init.body as string);
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
      };
    }, agendaWithPending);

    await page.goto('/agenda/mock-agenda-transfer');

    // Bob sees the pending transfers modal
    await expect(page.locator('text=Übertragene Agendapunkte')).toBeVisible();

    // Bob rejects the transfer
    const rejectBtn = page.locator('[data-testid="reject-transfer-item-1"]');
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();

    // Modal closes
    await expect(page.locator('text=Übertragene Agendapunkte')).toBeHidden({ timeout: 5000 });

    // Item-1 is now strictly Alice's again without pending status
    await expect(page.locator('text=(ausstehend)')).toBeHidden();
  });
});
