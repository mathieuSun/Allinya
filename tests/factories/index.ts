/**
 * Test Data Factories
 * Central export for all test data builders
 * All IDs are UUID-based for consistency
 */

import { UserFactory } from './user-factory';
import type { TestUser, TestPractitioner } from './user-factory';
import { SessionFactory } from './session-factory';
import type { TestSession, TestReview } from './session-factory';

export { UserFactory } from './user-factory';
export type { TestUser, TestPractitioner } from './user-factory';

export { SessionFactory } from './session-factory';
export type { TestSession, TestReview } from './session-factory';

// Convenience re-exports
export const createGuest = UserFactory.createGuest;
export const createPractitioner = UserFactory.createPractitioner;
export const createSession = SessionFactory.createSession;
export const createWaitingRoomSession = SessionFactory.createWaitingRoomSession;
export const createLiveSession = SessionFactory.createLiveSession;
export const createEndedSession = SessionFactory.createEndedSession;
export const createReview = SessionFactory.createReview;