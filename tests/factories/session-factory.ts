/**
 * Test Data Factory: Sessions
 * Creates test session data with UUID-based IDs
 */

import { faker } from '@faker-js/faker';

export interface TestSession {
  id: string; // UUID
  guestId: string; // UUID
  practitionerId: string; // UUID
  status: 'waitingRoom' | 'live' | 'ended';
  agoraChannel: string;
  readyGuest: boolean;
  readyPractitioner: boolean;
  liveStartedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestReview {
  id: string; // UUID
  sessionId: string; // UUID
  reviewerId: string; // UUID
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SessionFactory {
  static createSession(overrides?: Partial<TestSession>): TestSession {
    const status = overrides?.status || faker.helpers.arrayElement(['waitingRoom', 'live', 'ended']);
    
    let liveStartedAt: Date | null = null;
    let endedAt: Date | null = null;
    
    if (status === 'live') {
      liveStartedAt = faker.date.recent({ days: 1 });
    } else if (status === 'ended') {
      liveStartedAt = faker.date.recent({ days: 1 });
      endedAt = new Date(liveStartedAt.getTime() + faker.number.int({ min: 300000, max: 3600000 })); // 5-60 minutes
    }
    
    return {
      id: faker.string.uuid(),
      guestId: faker.string.uuid(),
      practitionerId: faker.string.uuid(),
      status,
      agoraChannel: faker.string.alphanumeric(10),
      readyGuest: status !== 'waitingRoom' || faker.datatype.boolean(),
      readyPractitioner: status !== 'waitingRoom' || faker.datatype.boolean(),
      liveStartedAt,
      endedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  static createWaitingRoomSession(overrides?: Partial<TestSession>): TestSession {
    return this.createSession({
      status: 'waitingRoom',
      readyGuest: false,
      readyPractitioner: false,
      liveStartedAt: null,
      endedAt: null,
      ...overrides,
    });
  }
  
  static createLiveSession(overrides?: Partial<TestSession>): TestSession {
    const liveStartedAt = faker.date.recent({ days: 1 });
    
    return this.createSession({
      status: 'live',
      readyGuest: true,
      readyPractitioner: true,
      liveStartedAt,
      endedAt: null,
      ...overrides,
    });
  }
  
  static createEndedSession(overrides?: Partial<TestSession>): TestSession {
    const liveStartedAt = faker.date.recent({ days: 2 });
    const sessionDuration = faker.number.int({ min: 300000, max: 3600000 }); // 5-60 minutes
    const endedAt = new Date(liveStartedAt.getTime() + sessionDuration);
    
    return this.createSession({
      status: 'ended',
      readyGuest: true,
      readyPractitioner: true,
      liveStartedAt,
      endedAt,
      ...overrides,
    });
  }
  
  static createReview(overrides?: Partial<TestReview>): TestReview {
    return {
      id: faker.string.uuid(),
      sessionId: faker.string.uuid(),
      reviewerId: faker.string.uuid(),
      rating: faker.number.int({ min: 1, max: 5 }),
      comment: faker.lorem.sentences(2),
      createdAt: new Date(),
      updatedAt: new Date(),
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
    const liveStartedAt = faker.date.recent({ days: 1 });
    const endedAt = new Date(liveStartedAt.getTime() + 1800000); // 30 minutes
    
    return {
      session: this.createEndedSession({
        id: sessionId,
        guestId: guestId,
        practitionerId: practitionerId,
        liveStartedAt,
        endedAt,
      }),
      guestReview: this.createReview({
        sessionId: sessionId,
        reviewerId: guestId,
        rating: faker.number.int({ min: 4, max: 5 }),
      }),
      practitionerReview: this.createReview({
        sessionId: sessionId,
        reviewerId: practitionerId,
        rating: faker.number.int({ min: 4, max: 5 }),
      }),
    };
  }
}