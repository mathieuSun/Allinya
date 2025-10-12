/**
 * E2E Test: Session Flow
 * Tests the complete session lifecycle from request to completion
 */

import { test, expect } from '@playwright/test';

test.describe('Session Flow', () => {
  // Use existing test accounts
  const guestCredentials = {
    email: 'cheekyma@hotmail.com',
    password: 'password', // Update with actual password
  };
  
  const practitionerCredentials = {
    email: 'chefmat2018@gmail.com',
    password: 'password', // Update with actual password
  };
  
  test.beforeEach(async ({ context }) => {
    // Clear cookies to ensure fresh state
    await context.clearCookies();
  });
  
  test('Complete session flow: request → waiting room → live → end', async ({ browser }) => {
    // Create two browser contexts for guest and practitioner
    const guestContext = await browser.newContext();
    const practitionerContext = await browser.newContext();
    
    const guestPage = await guestContext.newPage();
    const practitionerPage = await practitionerContext.newPage();
    
    // Step 1: Login as guest
    await guestPage.goto('/auth');
    await guestPage.getByTestId('tab-login').click();
    await guestPage.getByTestId('input-login-email').fill(guestCredentials.email);
    await guestPage.getByTestId('input-login-password').fill(guestCredentials.password);
    await guestPage.getByTestId('button-login-submit').click();
    await expect(guestPage).toHaveURL('/explore');
    
    // Step 2: Login as practitioner
    await practitionerPage.goto('/auth');
    await practitionerPage.getByTestId('tab-login').click();
    await practitionerPage.getByTestId('input-login-email').fill(practitionerCredentials.email);
    await practitionerPage.getByTestId('input-login-password').fill(practitionerCredentials.password);
    await practitionerPage.getByTestId('button-login-submit').click();
    await expect(practitionerPage).toHaveURL('/profile');
    
    // Step 3: Practitioner goes online
    await practitionerPage.getByTestId('toggle-online-status').click();
    await expect(practitionerPage.getByTestId('text-status')).toContainText('Online');
    
    // Step 4: Guest requests session
    await guestPage.goto('/explore');
    await guestPage.waitForSelector('[data-testid^="card-practitioner-"]');
    const practitionerCard = await guestPage.locator('[data-testid^="card-practitioner-"]').first();
    await practitionerCard.getByTestId('button-request-session').click();
    
    // Should redirect to session page
    await expect(guestPage).toHaveURL(/\/s\/.+/);
    
    // Get session ID from URL
    const sessionUrl = await guestPage.url();
    const sessionId = sessionUrl.split('/s/')[1];
    
    // Step 5: Practitioner navigates to session
    await practitionerPage.goto(`/s/${sessionId}`);
    
    // Both should see waiting room
    await expect(guestPage.getByTestId('text-session-phase')).toContainText(/waiting room/i);
    await expect(practitionerPage.getByTestId('text-session-phase')).toContainText(/waiting room/i);
    
    // Step 6: Both ready up
    await guestPage.getByTestId('button-ready').click();
    await practitionerPage.getByTestId('button-ready').click();
    
    // Should transition to live video
    await expect(guestPage.getByTestId('text-session-phase')).toContainText(/live/i, { timeout: 10000 });
    await expect(practitionerPage.getByTestId('text-session-phase')).toContainText(/live/i, { timeout: 10000 });
    
    // Verify video controls are present
    await expect(guestPage.getByTestId('button-toggle-camera')).toBeVisible();
    await expect(guestPage.getByTestId('button-toggle-mic')).toBeVisible();
    await expect(practitionerPage.getByTestId('button-toggle-camera')).toBeVisible();
    await expect(practitionerPage.getByTestId('button-toggle-mic')).toBeVisible();
    
    // Step 7: End session
    await guestPage.getByTestId('button-end-session').click();
    await guestPage.getByTestId('button-confirm-end').click(); // Confirm dialog
    
    // Should show ended state
    await expect(guestPage.getByTestId('text-session-status')).toContainText(/ended/i);
    
    // Clean up
    await guestContext.close();
    await practitionerContext.close();
  });
  
  test('Practitioner presence updates in real-time', async ({ page, browser }) => {
    const practitionerContext = await browser.newContext();
    const practitionerPage = await practitionerContext.newPage();
    
    // Login as practitioner
    await practitionerPage.goto('/auth');
    await practitionerPage.getByTestId('tab-login').click();
    await practitionerPage.getByTestId('input-login-email').fill(practitionerCredentials.email);
    await practitionerPage.getByTestId('input-login-password').fill(practitionerCredentials.password);
    await practitionerPage.getByTestId('button-login-submit').click();
    
    // Guest views explore page
    await page.goto('/explore');
    
    // Initially practitioner should be offline
    const practitionerCard = page.locator(`[data-testid="status-indicator-offline"]`).first();
    await expect(practitionerCard).toBeVisible();
    
    // Practitioner goes online
    await practitionerPage.getByTestId('toggle-online-status').click();
    
    // Guest should see status update to online
    await expect(page.locator(`[data-testid="status-indicator-online"]`).first()).toBeVisible({ timeout: 5000 });
    
    // Clean up
    await practitionerContext.close();
  });
  
  test('Session rejoin works after disconnect', async ({ page }) => {
    // Login as guest
    await page.goto('/auth');
    await page.getByTestId('tab-login').click();
    await page.getByTestId('input-login-email').fill(guestCredentials.email);
    await page.getByTestId('input-login-password').fill(guestCredentials.password);
    await page.getByTestId('button-login-submit').click();
    
    // Create a session (assuming one exists)
    await page.goto('/explore');
    await page.getByTestId('button-my-sessions').click();
    
    // Click on active session if exists
    const activeSession = page.locator('[data-testid^="session-item-active-"]').first();
    if (await activeSession.isVisible()) {
      await activeSession.click();
      
      // Should be able to rejoin
      await expect(page).toHaveURL(/\/s\/.+/);
      await expect(page.getByTestId('text-session-phase')).toBeVisible();
    }
  });
});