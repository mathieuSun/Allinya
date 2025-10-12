/**
 * E2E Test: Authentication Flow
 * Tests sign-up, login, and logout for both guests and practitioners
 */

import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Authentication Flow', () => {
  test('Guest can sign up, login, and logout', async ({ page }) => {
    const testUser = {
      email: faker.internet.email(),
      password: 'TestPassword123!',
      fullName: faker.person.fullName(),
    };
    
    // Navigate to auth page
    await page.goto('/auth');
    
    // Switch to sign-up tab
    await page.getByTestId('tab-signup').click();
    
    // Fill sign-up form
    await page.getByTestId('input-signup-email').fill(testUser.email);
    await page.getByTestId('input-signup-password').fill(testUser.password);
    await page.getByTestId('input-signup-fullname').fill(testUser.fullName);
    await page.getByTestId('select-signup-role').click();
    await page.getByTestId('option-guest').click();
    
    // Submit sign-up
    await page.getByTestId('button-signup-submit').click();
    
    // Should redirect to explore page
    await expect(page).toHaveURL('/explore');
    await expect(page.getByTestId('text-welcome-user')).toContainText(testUser.fullName);
    
    // Logout
    await page.getByTestId('button-logout').click();
    await expect(page).toHaveURL('/auth');
    
    // Now login with same credentials
    await page.getByTestId('tab-login').click();
    await page.getByTestId('input-login-email').fill(testUser.email);
    await page.getByTestId('input-login-password').fill(testUser.password);
    await page.getByTestId('button-login-submit').click();
    
    // Should be logged in
    await expect(page).toHaveURL('/explore');
    await expect(page.getByTestId('text-welcome-user')).toContainText(testUser.fullName);
  });
  
  test('Practitioner can sign up with profile setup', async ({ page }) => {
    const testPractitioner = {
      email: faker.internet.email(),
      password: 'TestPassword123!',
      fullName: faker.person.fullName(),
      bio: faker.lorem.paragraph(),
      specialties: ['Reiki', 'Meditation'],
      hourlyRate: '100',
    };
    
    // Navigate to auth page
    await page.goto('/auth');
    
    // Switch to sign-up tab
    await page.getByTestId('tab-signup').click();
    
    // Fill sign-up form
    await page.getByTestId('input-signup-email').fill(testPractitioner.email);
    await page.getByTestId('input-signup-password').fill(testPractitioner.password);
    await page.getByTestId('input-signup-fullname').fill(testPractitioner.fullName);
    await page.getByTestId('select-signup-role').click();
    await page.getByTestId('option-practitioner').click();
    
    // Submit sign-up
    await page.getByTestId('button-signup-submit').click();
    
    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding');
    
    // Fill practitioner profile
    await page.getByTestId('input-practitioner-bio').fill(testPractitioner.bio);
    await page.getByTestId('input-practitioner-rate').fill(testPractitioner.hourlyRate);
    
    // Select specialties
    for (const specialty of testPractitioner.specialties) {
      await page.getByTestId(`checkbox-specialty-${specialty.toLowerCase()}`).check();
    }
    
    // Complete onboarding
    await page.getByTestId('button-onboarding-complete').click();
    
    // Should redirect to profile
    await expect(page).toHaveURL('/profile');
    await expect(page.getByTestId('text-practitioner-bio')).toContainText(testPractitioner.bio);
  });
  
  test('Invalid credentials show error message', async ({ page }) => {
    await page.goto('/auth');
    
    // Try to login with invalid credentials
    await page.getByTestId('tab-login').click();
    await page.getByTestId('input-login-email').fill('invalid@email.com');
    await page.getByTestId('input-login-password').fill('wrongpassword');
    await page.getByTestId('button-login-submit').click();
    
    // Should show error message
    await expect(page.getByTestId('text-error-message')).toBeVisible();
    await expect(page.getByTestId('text-error-message')).toContainText(/invalid|incorrect|wrong/i);
  });
});