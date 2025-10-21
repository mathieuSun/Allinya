/**
 * Test Data Factory: Users
 * Creates test practitioners and guests with UUID-based IDs
 */

import { faker } from '@faker-js/faker';

export interface TestUser {
  id: string; // UUID
  email: string;
  password: string;
  fullName: string;
  role: 'guest' | 'practitioner';
  createdAt: Date;
  updatedAt: Date;
}

export interface TestPractitioner extends TestUser {
  role: 'practitioner';
  bio: string;
  specialties: string[];
  hourlyRate: number;
  rating: number;
  isOnline: boolean;
}

export class UserFactory {
  static createGuest(overrides?: Partial<TestUser>): TestUser {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: 'Test123!@#',
      fullName: faker.person.fullName(),
      role: 'guest',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  static createPractitioner(overrides?: Partial<TestPractitioner>): TestPractitioner {
    const specialties = [
      'Energy Healing',
      'Reiki',
      'Chakra Balancing',
      'Crystal Healing',
      'Sound Healing',
      'Meditation',
      'Breathwork',
      'Life Coaching',
      'Spiritual Counseling',
      'Tarot Reading',
    ];
    
    const selectedSpecialties = faker.helpers.arrayElements(
      specialties,
      faker.number.int({ min: 1, max: 3 })
    );
    
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: 'Test123!@#',
      fullName: faker.person.fullName(),
      role: 'practitioner',
      bio: faker.lorem.paragraph(),
      specialties: selectedSpecialties,
      hourlyRate: faker.number.int({ min: 50, max: 200 }),
      rating: faker.number.float({ min: 3.5, max: 5, multipleOf: 0.1 }),
      isOnline: faker.datatype.boolean(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
  
  static createBatch<T extends TestUser>(
    count: number,
    factoryFn: () => T
  ): T[] {
    return Array.from({ length: count }, factoryFn);
  }
  
  static createGuestBatch(count: number, overrides?: Partial<TestUser>): TestUser[] {
    return this.createBatch(count, () => this.createGuest(overrides));
  }
  
  static createPractitionerBatch(
    count: number,
    overrides?: Partial<TestPractitioner>
  ): TestPractitioner[] {
    return this.createBatch(count, () => this.createPractitioner(overrides));
  }
}