/**
 * Test Data Factory: Sessions
 * Creates test session data with UUID-based IDs
 */

import { faker } from '@faker-js/faker';

export interface TestSession {
  id: string; // UUID
  guest_id: string; // UUID
  practitioner_id: string; // UUID
  status: 'waiting_room' | 'live' | 'ended';
  agora_channel: string;
  ready_guest: boolean;
  ready_practitioner: boolean;
  live_started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TestReview {
  id: string; // UUID
  session_id: string; // UUID
  reviewer_id: string; // UUID
  rating: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
}

export class SessionFactory {
  static createSession(overrides?: Partial<TestSession>): TestSession {
    const status = overrides?.status || faker.helpers.arrayElement(['waiting_room', 'live', 'ended']);
    
    let live_started_at = null;
    let ended_at = null;
    
    if (status === 'live') {
      live_started_at = faker.date.recent({ days: 1 });
    } else if (status === 'ended') {
      live_started_at = faker.date.recent({ days: 1 });
      ended_at = new Date(live_started_at.getTime() + faker.number.int({ min: 300000, max: 3600000 })); // 5-60 minutes
    }
    
    return {
      id: faker.string.uuid(),
      guest_id: faker.string.uuid(),
      practitioner_id: faker.string.uuid(),
      status,
      agora_channel: faker.string.alphanumeric(10),
      ready_guest: status !== 'waiting_room' || faker.datatype.boolean(),
      ready_practitioner: status !== 'waiting_room' || faker.datatype.boolean(),
      live_started_at,
      ended_at,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }
  
  static createWaitingRoomSession(overrides?: Partial<TestSession>): TestSession {
    return this.createSession({
      status: 'waiting_room',
      ready_guest: false,
      ready_practitioner: false,
      live_started_at: null,
      ended_at: null,
      ...overrides,
    });
  }
  
  static createLiveSession(overrides?: Partial<TestSession>): TestSession {
    const live_started_at = faker.date.recent({ days: 1 });
    
    return this.createSession({
      status: 'live',
      ready_guest: true,
      ready_practitioner: true,
      live_started_at,
      ended_at: null,
      ...overrides,
    });
  }
  
  static createEndedSession(overrides?: Partial<TestSession>): TestSession {
    const live_started_at = faker.date.recent({ days: 2 });
    const sessionDuration = faker.number.int({ min: 300000, max: 3600000 }); // 5-60 minutes
    const ended_at = new Date(live_started_at.getTime() + sessionDuration);
    
    return this.createSession({
      status: 'ended',
      ready_guest: true,
      ready_practitioner: true,
      live_started_at,
      ended_at,
      ...overrides,
    });
  }
  
  static createReview(overrides?: Partial<TestReview>): TestReview {
    return {
      id: faker.string.uuid(),
      session_id: faker.string.uuid(),
      reviewer_id: faker.string.uuid(),
      rating: faker.number.int({ min: 1, max: 5 }),
      comment: faker.lorem.sentences(2),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }
  
  static createSessionBatch(count: number, overrides?: Partial<TestSession>): TestSession[] {
    return Array.from({ length: count }, () => this.createSession(overrides));
  }
  
  static createReviewBatch(count: number, overrides?: Partial<TestReview>): TestReview[] {
    return Array.from({ length: count }, () => this.createReview(overrides));
  }
  
  // Helper to create a complete session flow
  static createCompleteSessionFlow(guestId: string, practitionerId: string) {
    const sessionId = faker.string.uuid();
    const live_started_at = faker.date.recent({ days: 1 });
    const ended_at = new Date(live_started_at.getTime() + 1800000); // 30 minutes
    
    return {
      session: this.createEndedSession({
        id: sessionId,
        guest_id: guestId,
        practitioner_id: practitionerId,
        live_started_at,
        ended_at,
      }),
      guestReview: this.createReview({
        session_id: sessionId,
        reviewer_id: guestId,
        rating: faker.number.int({ min: 4, max: 5 }),
      }),
      practitionerReview: this.createReview({
        session_id: sessionId,
        reviewer_id: practitionerId,
        rating: faker.number.int({ min: 4, max: 5 }),
      }),
    };
  }
}