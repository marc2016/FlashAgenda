import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import {
  evaluateGlobalAchievements,
  evaluateAgendaAchievements,
  calculateRank
} from '../src/services/achievementService';

vi.mock('../src/models/Agenda', () => {
  const mockAgendaData = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Backend Test Agenda',
    createdBy: 'test-user-123',
    items: [
      {
        _id: 'item-1',
        title: 'Task 1',
        createdBy: 'test-user-123',
        author: 'Max Mustermann',
        completed: true,
        comments: [
          { id: 'c1', text: 'Hello', author: 'Max Mustermann', createdBy: 'test-user-123' }
        ]
      }
    ],
    attendees: [
      {
        id: 'test-user-123',
        name: 'Max Mustermann',
        email: 'max@beispiel.de',
        cardColor: '#0a4b7c',
        securityCode: '1234',
        pinnedAchievements: ['creator_first']
      }
    ]
  };

  const MockAgendaClass = function() {
    return mockAgendaData;
  } as any;

  MockAgendaClass.findById = vi.fn().mockResolvedValue(mockAgendaData);
  MockAgendaClass.find = vi.fn().mockResolvedValue([mockAgendaData]);

  return {
    default: MockAgendaClass
  };
});

describe('Achievement Service - Unit Tests', () => {
  it('should calculate ranks correctly based on unlocked counts', () => {
    expect(calculateRank(0).rank).toBe('Agenda-Rookie');
    expect(calculateRank(2).level).toBe(1);
    expect(calculateRank(3).rank).toBe('Planer');
    expect(calculateRank(5).level).toBe(2);
    expect(calculateRank(6).rank).toBe('Agenda-Hero');
    expect(calculateRank(9).rank).toBe('Flash-Champion');
    expect(calculateRank(13).rank).toBe('Flash-Legende');
    expect(calculateRank(15).level).toBe(5);
  });

  it('should evaluate global achievements for a brand new user', () => {
    const result = evaluateGlobalAchievements([], 'user-1', 'Max');
    expect(result.unlockedCount).toBe(0);
    expect(result.rank).toBe('Agenda-Rookie');
    expect(result.totalXp).toBe(0);
    expect(result.achievements.length).toBeGreaterThan(10);
  });

  it('should unlock creation and contribution tiers (1, 10, 25, 50, 100)', () => {
    const mockItems = Array.from({ length: 26 }).map((_, i) => ({
      _id: `item-${i}`,
      title: `Task ${i}`,
      createdBy: 'user-1',
      author: 'Max',
      completed: i < 5
    }));

    const mockAgendas: any[] = [
      {
        _id: 'ag-1',
        title: 'Meeting 1',
        createdBy: 'user-1',
        attendees: [{ id: 'user-1', name: 'Max' }],
        items: mockItems
      }
    ];

    const result = evaluateGlobalAchievements(
      mockAgendas,
      'user-1',
      'Max',
      { cardColor: '#e11d48', avatarUrl: 'https://img.png', secretGuid: 'guid-123' }
    );

    const pionier = result.achievements.find(a => a.id === 'creator_first');
    expect(pionier?.unlocked).toBe(true);

    const starter = result.achievements.find(a => a.id === 'items_1');
    expect(starter?.unlocked).toBe(true);

    const ideenfeuerwerk = result.achievements.find(a => a.id === 'items_10');
    expect(ideenfeuerwerk?.unlocked).toBe(true);

    const taskTitan = result.achievements.find(a => a.id === 'items_25');
    expect(taskTitan?.unlocked).toBe(true);

    const inhaltsMaschine = result.achievements.find(a => a.id === 'items_50');
    expect(inhaltsMaschine?.unlocked).toBe(false);
    expect(inhaltsMaschine?.current).toBe(26);

    const finisher = result.achievements.find(a => a.id === 'items_done_5');
    expect(finisher?.unlocked).toBe(true);

    const colorCustom = result.achievements.find(a => a.id === 'color_custom');
    expect(colorCustom?.unlocked).toBe(true);

    const avatarCustom = result.achievements.find(a => a.id === 'avatar_custom');
    expect(avatarCustom?.unlocked).toBe(true);

    const securityTotp = result.achievements.find(a => a.id === 'security_totp');
    expect(securityTotp?.unlocked).toBe(true);
  });

  it('should evaluate agenda-specific milestones and personal achievements', () => {
    const mockAgenda: any = {
      _id: 'ag-test-1',
      title: 'Sprint Planning',
      date: '2026-09-10',
      time: '10:00',
      location: { name: 'HQ Room A', lat: 50, lng: 8 },
      attendees: [
        { id: 'u1', name: 'Alice', attendanceStatus: 'present' },
        { id: 'u2', name: 'Bob', attendanceStatus: 'present' },
        { id: 'u3', name: 'Charlie', attendanceStatus: 'present' }
      ],
      items: [
        {
          _id: 'i1',
          title: 'Item 1',
          createdBy: 'u1',
          author: 'Alice',
          completed: true,
          upvotes: ['u2', 'u3'],
          comments: [
            { id: 'c1', createdBy: 'u1', author: 'Alice', text: 'Looks good' }
          ]
        },
        {
          _id: 'i2',
          title: 'Item 2',
          createdBy: 'u1',
          author: 'Alice',
          completed: true
        }
      ]
    };

    const resAlice = evaluateAgendaAchievements(mockAgenda, 'u1', 'Alice');

    // Milestones
    const fullHouse = resAlice.teamMilestones.find(m => m.id === 'full_house');
    expect(fullHouse?.unlocked).toBe(true);

    const allCompleted = resAlice.teamMilestones.find(m => m.id === 'all_completed');
    expect(allCompleted?.unlocked).toBe(true);

    const wellPrepared = resAlice.teamMilestones.find(m => m.id === 'well_prepared');
    expect(wellPrepared?.unlocked).toBe(true);

    // Personal
    const creator = resAlice.personalAchievements.find(p => p.id === 'session_item_creator');
    expect(creator?.unlocked).toBe(true);

    const commenter = resAlice.personalAchievements.find(p => p.id === 'session_commenter');
    expect(commenter?.unlocked).toBe(true);
  });

  it('should dynamically shift leader trophies (Wanderpokale) when leader changes', () => {
    const mockAgenda: any = {
      _id: 'ag-leaders',
      attendees: [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' }
      ],
      items: [
        {
          _id: 'i1',
          createdBy: 'u1',
          author: 'Alice',
          completed: true,
          comments: [
            { id: 'c1', createdBy: 'u2', author: 'Bob', text: 'C1' },
            { id: 'c2', createdBy: 'u2', author: 'Bob', text: 'C2' }
          ]
        },
        {
          _id: 'i2',
          createdBy: 'u1',
          author: 'Alice',
          completed: true
        }
      ]
    };

    // State 1: Alice has 2 items, Bob has 0 items. Bob has 2 comments.
    const resAlice = evaluateAgendaAchievements(mockAgenda, 'u1', 'Alice');
    const pointsLeaderAlice = resAlice.dynamicLeaders.find(d => d.id === 'leader_points');
    expect(pointsLeaderAlice?.isCurrentUserLeader).toBe(true);
    expect(pointsLeaderAlice?.leader?.userName).toBe('Alice');
    expect(pointsLeaderAlice?.leader?.count).toBe(2);

    const resBob = evaluateAgendaAchievements(mockAgenda, 'u2', 'Bob');
    const pointsLeaderBob = resBob.dynamicLeaders.find(d => d.id === 'leader_points');
    expect(pointsLeaderBob?.isCurrentUserLeader).toBe(false);
    expect(pointsLeaderBob?.gapToLeader).toBe(2);

    const commentsLeaderBob = resBob.dynamicLeaders.find(d => d.id === 'leader_comments');
    expect(commentsLeaderBob?.isCurrentUserLeader).toBe(true);
    expect(commentsLeaderBob?.leader?.userName).toBe('Bob');
    expect(commentsLeaderBob?.leader?.count).toBe(2);

    // State 2: Bob adds 3 items, overtaking Alice!
    mockAgenda.items.push(
      { _id: 'i3', createdBy: 'u2', author: 'Bob' },
      { _id: 'i4', createdBy: 'u2', author: 'Bob' },
      { _id: 'i5', createdBy: 'u2', author: 'Bob' }
    );

    const resBobAfter = evaluateAgendaAchievements(mockAgenda, 'u2', 'Bob');
    const pointsLeaderBobAfter = resBobAfter.dynamicLeaders.find(d => d.id === 'leader_points');
    expect(pointsLeaderBobAfter?.isCurrentUserLeader).toBe(true);
    expect(pointsLeaderBobAfter?.leader?.userName).toBe('Bob');
    expect(pointsLeaderBobAfter?.leader?.count).toBe(3);

    const resAliceAfter = evaluateAgendaAchievements(mockAgenda, 'u1', 'Alice');
    const pointsLeaderAliceAfter = resAliceAfter.dynamicLeaders.find(d => d.id === 'leader_points');
    expect(pointsLeaderAliceAfter?.isCurrentUserLeader).toBe(false);
    expect(pointsLeaderAliceAfter?.gapToLeader).toBe(1);
  });

  it('should evaluate leader_images (Bilder-König) correctly based on image counts', () => {
    const mockAgenda: any = {
      _id: 'ag-images',
      attendees: [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' }
      ],
      items: [
        {
          _id: 'i1',
          createdBy: 'u1',
          author: 'Alice',
          imageUrl: 'https://img.example/pic1.jpg'
        },
        {
          _id: 'i2',
          createdBy: 'u2',
          author: 'Bob',
          imageUrls: ['https://img.example/pic2.jpg', 'https://img.example/pic3.jpg'],
          comments: [
            {
              id: 'c1',
              createdBy: 'u2',
              author: 'Bob',
              text: 'Photo comment',
              attachments: [{ name: 'pic4.png', url: 'https://img.example/pic4.png', type: 'image' }]
            }
          ]
        }
      ]
    };

    const resBob = evaluateAgendaAchievements(mockAgenda, 'u2', 'Bob');
    const imgLeaderBob = resBob.dynamicLeaders.find(d => d.id === 'leader_images');
    expect(imgLeaderBob?.isCurrentUserLeader).toBe(true);
    expect(imgLeaderBob?.title).toBe('Bilder-König');
    expect(imgLeaderBob?.leader?.userName).toBe('Bob');
    expect(imgLeaderBob?.leader?.count).toBe(3); // 2 on item + 1 in comment attachment

    const resAlice = evaluateAgendaAchievements(mockAgenda, 'u1', 'Alice');
    const imgLeaderAlice = resAlice.dynamicLeaders.find(d => d.id === 'leader_images');
    expect(imgLeaderAlice?.isCurrentUserLeader).toBe(false);
    expect(imgLeaderAlice?.current).toBe(1);
    expect(imgLeaderAlice?.gapToLeader).toBe(2);
  });

  it('should generate complete leaderboards with rankings and current user flag for all agenda achievements', () => {
    const mockAgenda: any = {
      _id: 'ag-leaderboard',
      attendees: [
        { id: 'u1', name: 'Alice', avatarUrl: 'https://avatar/alice.png' },
        { id: 'u2', name: 'Bob' },
        { id: 'u3', name: 'Charlie' }
      ],
      items: [
        { _id: 'i1', createdBy: 'u1', author: 'Alice', completed: true },
        { _id: 'i2', createdBy: 'u1', author: 'Alice', completed: true },
        {
          _id: 'i3',
          createdBy: 'u2',
          author: 'Bob',
          completed: false,
          comments: [
            { id: 'c1', createdBy: 'u2', author: 'Bob', text: 'Hi' }
          ]
        }
      ]
    };

    const res = evaluateAgendaAchievements(mockAgenda, 'u1', 'Alice');

    // Dynamic Leader: leader_points
    const pointsLeader = res.dynamicLeaders.find(d => d.id === 'leader_points');
    expect(pointsLeader?.leaderboard).toBeDefined();
    expect(pointsLeader?.leaderboard?.length).toBe(3);
    expect(pointsLeader?.leaderboard?.[0]).toMatchObject({
      userName: 'Alice',
      count: 2,
      rank: 1,
      isCurrentUser: true,
      avatarUrl: 'https://avatar/alice.png'
    });
    expect(pointsLeader?.leaderboard?.[1]).toMatchObject({
      userName: 'Bob',
      count: 1,
      rank: 2,
      isCurrentUser: false
    });
    expect(pointsLeader?.leaderboard?.[2]).toMatchObject({
      userName: 'Charlie',
      count: 0,
      rank: 3,
      isCurrentUser: false
    });

    // Personal Achievement: session_commenter
    const commenter = res.personalAchievements.find(p => p.id === 'session_commenter');
    expect(commenter?.leaderboard).toBeDefined();
    expect(commenter?.leaderboard?.[0].userName).toBe('Bob');
    expect(commenter?.leaderboard?.[0].count).toBe(1);
    expect(commenter?.leaderboard?.[0].unlocked).toBe(true);
  });

  it('should evaluate session_image_uploader, session_description_added and leader_words with word counting', () => {
    const mockAgenda: any = {
      _id: 'ag-words-images',
      attendees: [
        { id: 'u1', name: 'Alice' },
        { id: 'u2', name: 'Bob' }
      ],
      items: [
        {
          _id: 'i1',
          createdBy: 'u1',
          author: 'Alice',
          description: 'Hier ist eine detaillierte Beschreibung mit genau acht Wörtern.',
          imageUrl: 'https://img.com/item.png'
        },
        {
          _id: 'i2',
          createdBy: 'u2',
          author: 'Bob',
          description: 'Das ist Bob sein Text für diese Agenda.', // 8 words
          comments: []
        },
        {
          _id: 'i3',
          createdBy: 'u2',
          author: 'Bob',
          description: 'Und noch ein zweiter längerer Text mit weiteren Wörtern von Bob.', // 10 words (total Bob = 18 words)
          comments: []
        }
      ]
    };

    // Alice: 1 item with description (8 words), 1 image
    const resAlice = evaluateAgendaAchievements(mockAgenda, 'u1', 'Alice');
    const imgAlice = resAlice.personalAchievements.find(p => p.id === 'session_image_uploader');
    expect(imgAlice?.unlocked).toBe(true);
    expect(imgAlice?.current).toBe(1);

    const descAlice = resAlice.personalAchievements.find(p => p.id === 'session_description_added');
    expect(descAlice?.unlocked).toBe(true);
    expect(descAlice?.current).toBe(1);

    const wordsAlice = resAlice.dynamicLeaders.find(d => d.id === 'leader_words');
    expect(wordsAlice?.isCurrentUserLeader).toBe(false);
    expect(wordsAlice?.current).toBe(9);
    expect(wordsAlice?.leader?.userName).toBe('Bob');
    expect(wordsAlice?.leader?.count).toBe(19);

    // Bob: 2 items with description (19 words total), 0 images
    const resBob = evaluateAgendaAchievements(mockAgenda, 'u2', 'Bob');
    const imgBob = resBob.personalAchievements.find(p => p.id === 'session_image_uploader');
    expect(imgBob?.unlocked).toBe(false);
    expect(imgBob?.current).toBe(0);

    const descBob = resBob.personalAchievements.find(p => p.id === 'session_description_added');
    expect(descBob?.unlocked).toBe(true);
    expect(descBob?.current).toBe(2);

    const wordsBob = resBob.dynamicLeaders.find(d => d.id === 'leader_words');
    expect(wordsBob?.isCurrentUserLeader).toBe(true);
    expect(wordsBob?.current).toBe(19);
    expect(wordsBob?.gapToLeader).toBe(0);
  });
});

describe('Achievement Routes - Integration Tests', () => {
  it('GET /api/agendas/user-achievements should return global achievements schema', async () => {
    const res = await request(app).get('/api/agendas/user-achievements?user=test-user-123&name=Max%20Mustermann');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('achievements');
    expect(res.body).toHaveProperty('rank');
    expect(res.body).toHaveProperty('unlockedCount');
    expect(Array.isArray(res.body.achievements)).toBe(true);
  });

  it('GET /api/agendas/:id/achievements should return agenda achievements schema', async () => {
    const res = await request(app).get('/api/agendas/507f1f77bcf86cd799439011/achievements?user=test-user-123');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('teamMilestones');
    expect(res.body).toHaveProperty('personalAchievements');
    expect(res.body).toHaveProperty('dynamicLeaders');
    expect(Array.isArray(res.body.dynamicLeaders)).toBe(true);
  });
});
