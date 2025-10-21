import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createRequire } from "module";
import { agoraConfig, supabaseConfig } from "./config";
import { supabaseStorage, type StorageBucket } from "./supabaseStorage";
import { createClient } from '@supabase/supabase-js';
import type { SessionWithParticipants } from "@shared/schema";
import { strictCamelCaseValidator, validateResponseWrapper } from "./middleware/camelCaseValidator";

// Import Agora token builder (CommonJS module)
const require = createRequire(import.meta.url);
const AgoraToken = require("agora-token");
const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;
const RtcRole = AgoraToken.RtcRole;

// Create Supabase client with service role key for authentication operations
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);

// Build version info
const BUILD_TIMESTAMP = Date.now().toString();
const BUILD_VERSION = "1.0.0";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Supabase Storage buckets on startup
  await supabaseStorage.initializeBuckets();

  // CRITICAL: Apply strict camelCase validation to ALL API routes
  // This middleware enforces system rules for all requests and responses
  app.use('/api/*', strictCamelCaseValidator);

  // Apply aggressive no-cache headers to all API responses for iOS WebKit
  app.use((req: Request, res: Response, next) => {
    // Wrap response to validate all outgoing data
    validateResponseWrapper(res);
    
    // Set aggressive cache headers for all API routes
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Build-Timestamp': BUILD_TIMESTAMP,
      'X-Build-Version': BUILD_VERSION,
      'Surrogate-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Accept-Encoding, Origin'
    });
    
    // For iOS devices, add extra headers
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('WebKit') || userAgent.includes('iPad') || userAgent.includes('iPhone')) {
      res.set({
        'Clear-Site-Data': '"cache"',
        'X-iOS-Cache-Bust': BUILD_TIMESTAMP
      });
    }
    
    next();
  });
  
  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Cache bust endpoint - returns current build version
  app.get('/api/cache-bust', (req: Request, res: Response) => {
    const versionInfo = {
      buildTimestamp: BUILD_TIMESTAMP,
      version: BUILD_VERSION,
      serverTime: Date.now(),
      cacheClear: true,
      message: 'Cache cleared - please reload',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    // Send with explicit no-cache for iOS
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'X-Force-Reload': 'true'
    });
    
    res.json(versionInfo);
  });

  // Version check endpoint - used by frontend to detect version changes
  app.get('/api/version', (req: Request, res: Response) => {
    res.json({
      timestamp: BUILD_TIMESTAMP,
      version: BUILD_VERSION,
      requiresReload: false
    });
  });

  // POST /api/auth/signup - Create new user account
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const { email, password, full_name, role } = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        full_name: z.string().min(1),
        role: z.enum(['guest', 'practitioner'])
      }).parse(req.body);

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name
          }
        }
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      if (!authData.user) {
        return res.status(400).json({ error: 'Failed to create user' });
      }

      // Create profile for the new user
      const profile = await storage.createProfile({
        id: authData.user.id,
        role,
        displayName: full_name,
        country: null,
        bio: null,
        avatarUrl: null,
        galleryUrls: [],
        videoUrl: null,
        specialties: []
      });

      // If practitioner, create practitioner record
      if (role === 'practitioner') {
        await storage.createPractitioner({
          userId: authData.user.id,
          isOnline: false,
          inService: false,
          rating: "0.0",
          reviewCount: 0
        });
      }

      // Return user data and access token
      res.json({
        user: authData.user,
        session: authData.session,
        access_token: authData.session?.access_token,
        profile
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      res.status(400).json({ error: error.message || 'Signup failed' });
    }
  });

  // POST /api/auth/login - Sign in existing user
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string().min(1)
      }).parse(req.body);

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        return res.status(401).json({ error: authError.message });
      }

      if (!authData.user || !authData.session) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get user profile
      let profile = await storage.getProfile(authData.user.id);

      // Auto-create profile for existing Supabase Auth accounts without profiles
      if (!profile) {
        console.log(`No profile found for ${email}, auto-creating based on email...`);
        
        // Determine role based on email
        const role = email === 'chefmat2018@gmail.com' ? 'practitioner' : 
                    email === 'cheekyma@hotmail.com' ? 'guest' : 
                    'guest'; // Default to guest for any other email

        // Extract display name from email
        const displayName = email.split('@')[0].replace(/[0-9]/g, '').replace(/[._-]/g, ' ');

        // Create profile
        profile = await storage.createProfile({
          id: authData.user.id,
          role,
          displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          country: null,
          bio: null,
          avatarUrl: null,
          galleryUrls: [],
          videoUrl: null,
          specialties: [],
        });

        // If practitioner, create practitioner record
        if (role === 'practitioner') {
          console.log('Creating practitioner record for', email);
          await storage.createPractitioner({
            userId: authData.user.id,
            isOnline: false,
            inService: false,
            rating: "0.0",
            reviewCount: 0,
          });
        }

        console.log(`Profile auto-created for ${email} with role: ${role}`);
      }

      // Return user data and access token
      res.json({
        user: authData.user,
        session: authData.session,
        access_token: authData.session.access_token,
        profile
      });
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      res.status(401).json({ error: error.message || 'Login failed' });
    }
  });

  // POST /api/auth/logout - Sign out user
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      // Try to get token from Authorization header first
      const authHeader = req.headers.authorization;
      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (req.body.refresh_token) {
        // Fall back to refresh token from body if provided
        token = req.body.refresh_token;
      }

      if (token) {
        // Sign out the user session
        const { error } = await supabase.auth.admin.signOut(token);
        if (error) {
          console.error('Logout error:', error);
        }
      }

      // Always return 204 No Content for logout
      res.status(204).send();
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still return 204 even if there's an error
      res.status(204).send();
    }
  });

  // GET /api/auth/user - Get current authenticated user's profile
  app.get('/api/auth/user', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      // Also get practitioner data if user is a practitioner
      let practitionerData = null;
      if (profile.role === 'practitioner') {
        practitionerData = await storage.getPractitioner(userId);
      }

      res.json({
        id: userId,
        profile,
        practitioner: practitionerData
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(400).json({ error: error.message || 'Failed to get user data' });
    }
  });

  // POST /api/auth/role-init - Set user role on first login
  app.post('/api/auth/role-init', requireAuth, async (req: Request, res: Response) => {
    try {
      const { role } = z.object({
        role: z.enum(['guest', 'practitioner']),
      }).parse(req.body);

      const userId = req.user!.id;

      // Check if profile exists
      const existingProfile = await storage.getProfile(userId);
      if (existingProfile) {
        return res.status(400).json({ error: 'Profile already exists' });
      }

      // Create profile
      const profile = await storage.createProfile({
        id: userId,
        role,
        displayName: 'New User',
        country: null,
        bio: null,
        avatarUrl: null,
        galleryUrls: [],
        videoUrl: null,
        specialties: [],
      });

      // If practitioner, create practitioner record
      if (role === 'practitioner') {
        await storage.createPractitioner({
          userId,
          isOnline: false,
          inService: false,
          rating: "0.0",
          reviewCount: 0,
        });
      }

      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/profile - Get user profile
  app.get('/api/profile', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // PUT /api/profile - Update user profile
  app.put('/api/profile', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const updates = req.body;
      
      console.log(`PUT /api/profile - userId: ${userId}, updates:`, JSON.stringify(updates, null, 2));

      const profile = await storage.updateProfile(userId, updates);
      res.json(profile);
    } catch (error: any) {
      console.error('PUT /api/profile error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/presence/toggle - Toggle practitioner online status
  app.post('/api/presence/toggle', requireAuth, async (req: Request, res: Response) => {
    try {
      const { online } = z.object({
        online: z.boolean(),
      }).parse(req.body);

      const userId = req.user!.id;

      // Verify user is a practitioner
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== 'practitioner') {
        return res.status(403).json({ error: 'Only practitioners can toggle presence' });
      }

      const practitioner = await storage.updatePractitioner(userId, { isOnline: online });
      res.json(practitioner);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/practitioners/status - Get practitioner status
  app.get('/api/practitioners/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const practitioner = await storage.getPractitioner(userId);
      
      if (!practitioner) {
        return res.status(404).json({ error: 'Practitioner not found' });
      }

      res.json(practitioner);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/practitioners - Get all practitioners (online first, then offline)
  app.get('/api/practitioners', async (req: Request, res: Response) => {
    try {
      const practitioners = await storage.getAllPractitioners();
      res.json(practitioners);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/practitioners/online - Get online practitioners
  app.get('/api/practitioners/online', async (req: Request, res: Response) => {
    try {
      const practitioners = await storage.getOnlinePractitioners();
      res.json(practitioners);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/practitioners/:id - Get practitioner profile
  app.get('/api/practitioners/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const profile = await storage.getProfile(id);
      
      if (!profile || profile.role !== 'practitioner') {
        return res.status(404).json({ error: 'Practitioner not found' });
      }

      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // PATCH /api/practitioners/:id/status - Update practitioner online status
  app.patch('/api/practitioners/:id/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const practitionerId = req.params.id;
      const { isOnline } = req.body;
      
      // Validate input
      if (typeof isOnline !== 'boolean') {
        return res.status(400).json({ error: 'isOnline must be a boolean' });
      }

      const userId = req.user!.id;

      // Verify this is the practitioner's own account
      if (practitionerId !== userId) {
        return res.status(403).json({ error: 'Can only update your own status' });
      }

      // Verify user is a practitioner
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== 'practitioner') {
        return res.status(403).json({ error: 'Only practitioners can update their status' });
      }

      // Update practitioner status
      const practitioner = await storage.updatePractitioner(userId, { isOnline });
      
      res.json({ 
        success: true,
        isOnline: practitioner.isOnline,
        message: isOnline ? 'You are now online' : 'You are now offline'
      });
    } catch (error: any) {
      console.error('Error updating practitioner status:', error);
      res.status(400).json({ error: error.message || 'Failed to update status' });
    }
  });

  // POST /api/sessions/start - Start a new session
  app.post('/api/sessions/start', requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('Session start request:', req.body);
      
      const { practitionerId, liveSeconds } = z.object({
        practitionerId: z.string().uuid(),
        liveSeconds: z.number().int().positive(),
      }).parse(req.body);

      const guestId = req.user!.id;
      console.log('Guest ID:', guestId, 'Practitioner ID:', practitionerId);

      // Verify guest role
      const guest = await storage.getProfile(guestId);
      if (!guest || guest.role !== 'guest') {
        console.error('User is not a guest:', guest);
        return res.status(403).json({ error: 'Only guests can start sessions' });
      }

      // Verify practitioner exists and is online
      const practitioner = await storage.getPractitioner(practitionerId);
      console.log('Practitioner status:', practitioner);
      if (!practitioner || !(practitioner as any).isOnline) {
        return res.status(400).json({ error: 'Practitioner is not available' });
      }

      // Create session
      const sessionId = randomUUID();
      const agoraChannel = `sess_${sessionId.substring(0, 8)}`;
      
      console.log('Creating session with ID:', sessionId);
      
      const session = await storage.createSession({
        practitionerId: practitionerId,
        guestId: guestId,
        phase: 'waiting',
        liveSeconds: liveSeconds,
        practitionerReady: false,
        guestReady: false,
        acknowledgedPractitioner: false,  // Add this field with default value
        agoraChannel: agoraChannel,
      });

      console.log('Session created:', session);

      // Mark practitioner as in service
      await storage.updatePractitioner(practitionerId, { inService: true });

      res.json({ sessionId: session.id });
    } catch (error: any) {
      console.error('Error creating session:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/sessions/ready - Mark participant as ready
  app.post('/api/sessions/ready', requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId, who } = z.object({
        sessionId: z.string().uuid(),
        who: z.enum(['guest', 'practitioner']),
      }).parse(req.body);

      const userId = req.user!.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify user is participant
      if (userId !== session.guestId && userId !== session.practitionerId) {
        return res.status(403).json({ error: 'Not a session participant' });
      }

      // For practitioner, ensure they have acknowledged first
      if (who === 'practitioner' && !session.acknowledgedPractitioner) {
        return res.status(400).json({ 
          error: 'Please acknowledge the session request first' 
        });
      }

      const updates: Partial<SessionWithParticipants> = {};
      
      if (who === 'guest') {
        updates.readyGuest = true;
      } else {
        updates.readyPractitioner = true;
      }

      // Check if both ready, transition to live
      // If guest is marking ready, check if practitioner was already ready
      // If practitioner is marking ready, check if guest was already ready
      const bothReady = (who === 'guest') 
        ? session.readyPractitioner === true
        : session.readyGuest === true;

      if (bothReady && session.phase === 'waiting') {
        // Auto-transition to live phase when both parties are ready
        updates.phase = 'live';
        updates.liveStartedAt = new Date().toISOString();
        
        // Agora channel is already set when session is created
        // UIDs are generated dynamically in the /api/agora/token endpoint
        console.log(`Session ${sessionId} auto-transitioning to live phase - both parties ready`);
      }

      const updatedSession = await storage.updateSession(sessionId, updates);
      res.json(updatedSession);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/sessions/:id - Get session details
  app.get('/api/sessions/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const session = await storage.getSession(id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify user is participant
      if (userId !== session.guestId && userId !== session.practitionerId) {
        return res.status(403).json({ error: 'Not a session participant' });
      }

      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/sessions/acknowledge - Practitioner acknowledges session request
  app.post('/api/sessions/acknowledge', requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = z.object({
        sessionId: z.string().uuid(),
      }).parse(req.body);

      const userId = req.user!.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify user is the practitioner
      if (userId !== session.practitionerId) {
        return res.status(403).json({ error: 'Only the practitioner can acknowledge the session' });
      }

      // Verify session is in waiting phase
      if (session.phase !== 'waiting') {
        return res.status(400).json({ error: 'Session is not in waiting phase' });
      }

      // Update session to mark practitioner acknowledged
      const updatedSession = await storage.updateSession(sessionId, {
        acknowledgedPractitioner: true
      });

      res.json({ 
        success: true,
        message: 'Session acknowledged. Guest has been notified.',
        session: updatedSession
      });
    } catch (error: any) {
      console.error('Acknowledge error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      res.status(500).json({ error: error.message || 'Failed to acknowledge session' });
    }
  });

  // POST /api/sessions/end - End a session
  app.post('/api/sessions/end', requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = z.object({
        sessionId: z.string().uuid(),
      }).parse(req.body);

      const userId = req.user!.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify user is participant
      if (userId !== session.guestId && userId !== session.practitionerId) {
        return res.status(403).json({ error: 'Not a session participant' });
      }

      const updatedSession = await storage.updateSession(sessionId, {
        phase: 'ended'
      });

      // Mark practitioner as not in service
      await storage.updatePractitioner(session.practitionerId, { inService: false });

      res.json(updatedSession);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/sessions/practitioner - Get sessions for logged-in practitioner
  app.get('/api/sessions/practitioner', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Verify practitioner role
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== 'practitioner') {
        return res.status(403).json({ error: 'Only practitioners can access this endpoint' });
      }

      // Get all sessions for this practitioner (waiting and live phases)
      const sessions = await storage.getSessionsForPractitioner(userId);
      res.json(sessions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/sessions/accept - Accept a session request
  app.post('/api/sessions/accept', requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = z.object({
        sessionId: z.string().uuid(),
      }).parse(req.body);

      const userId = req.user!.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify user is the practitioner
      if (userId !== session.practitionerId) {
        return res.status(403).json({ error: 'Only the practitioner can accept the session' });
      }

      // Verify session is in waiting phase
      if (session.phase !== 'waiting') {
        return res.status(400).json({ error: 'Session is not in waiting phase' });
      }

      // Mark practitioner as acknowledged and ready when accepting from dashboard
      const updatedSession = await storage.updateSession(sessionId, {
        acknowledgedPractitioner: true,
        readyPractitioner: true,
      });

      res.json(updatedSession);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/sessions/reject - Reject a session request
  app.post('/api/sessions/reject', requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = z.object({
        sessionId: z.string().uuid(),
      }).parse(req.body);

      const userId = req.user!.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify user is the practitioner
      if (userId !== session.practitionerId) {
        return res.status(403).json({ error: 'Only the practitioner can reject the session' });
      }

      // End the session
      const updatedSession = await storage.updateSession(sessionId, {
        phase: 'ended'
      });

      // Mark practitioner as not in service
      await storage.updatePractitioner(session.practitionerId, { inService: false });

      res.json(updatedSession);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/agora/token - Generate Agora RTC token
  app.get('/api/agora/token', requireAuth, async (req: Request, res: Response) => {
    try {
      const { channel, uid } = z.object({
        channel: z.string(),
        uid: z.string(),
      }).parse(req.query);

      const userId = req.user!.id;

      // Find session by channel
      // In a real implementation, you'd query sessions by agoraChannel
      // For now, we'll trust the request is valid since we verify user is authenticated

      const { appId, appCertificate } = agoraConfig;

      if (!appId || !appCertificate) {
        return res.status(500).json({ error: 'Agora credentials not configured' });
      }

      const privilegeExpireTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      // Both practitioners and guests need to publish audio/video in a call
      // So we always use PUBLISHER role for both
      const agoraRole = RtcRole.PUBLISHER;

      const token = RtcTokenBuilder.buildTokenWithUserAccount(
        appId,
        appCertificate,
        channel,
        uid, // Use string UID directly
        agoraRole,
        privilegeExpireTime
      );

      res.json({ 
        token,
        appId,
        uid
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // POST /api/reviews - Submit a review
  app.post('/api/reviews', requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId, rating, comment } = z.object({
        sessionId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().optional(),
      }).parse(req.body);

      const userId = req.user!.id;
      const session = await storage.getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify user is the guest
      if (userId !== session.guestId) {
        return res.status(403).json({ error: 'Only guests can submit reviews' });
      }

      const review = await storage.createReview({
        sessionId: sessionId,
        guestId: userId,
        practitionerId: session.practitionerId,
        rating,
        comment: comment || null,
      });

      res.json(review);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Supabase Storage Upload Endpoints

  // Get upload URL for avatar
  app.post("/api/upload/avatar", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { uploadUrl, publicUrl, fileName } = await supabaseStorage.getUploadUrl('avatars', userId);
      
      // Extract the token from the signed URL
      // Supabase signed URLs include the token as a query parameter
      const urlObj = new URL(uploadUrl);
      const token = urlObj.searchParams.get('token') || '';
      
      res.json({ uploadUrl, publicUrl, fileName, token });
    } catch (error: any) {
      console.error('Avatar upload URL error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/upload/avatar/sync - Sync the latest uploaded avatar to profile
  app.post("/api/upload/avatar/sync", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // List files in the user's avatar folder, sorted by most recent
      const supabaseClient = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);
      const { data: files, error: listError } = await supabaseClient.storage
        .from('avatars')
        .list(userId, {
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (listError) {
        throw new Error(`Failed to list avatar files: ${listError.message}`);
      }
      
      if (!files || files.length === 0) {
        return res.status(404).json({ error: 'No avatar files found' });
      }
      
      // Get the most recent file
      const latestFile = files[0];
      const publicUrl = `${supabaseConfig.url}/storage/v1/object/public/avatars/${userId}/${latestFile.name}`;
      
      // Update the user's profile with this avatar URL
      await storage.updateProfile(userId, { avatarUrl: publicUrl });
      
      res.json({ 
        success: true, 
        avatarUrl: publicUrl,
        fileName: latestFile.name 
      });
    } catch (error: any) {
      console.error('Avatar sync error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get upload URL for gallery image
  app.post("/api/upload/gallery", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { uploadUrl, publicUrl, fileName } = await supabaseStorage.getUploadUrl('gallery', userId);
      
      // Extract the token from the signed URL
      const urlObj = new URL(uploadUrl);
      const token = urlObj.searchParams.get('token') || '';
      
      res.json({ uploadUrl, publicUrl, fileName, token });
    } catch (error: any) {
      console.error('Gallery upload URL error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get upload URL for video
  app.post("/api/upload/video", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { uploadUrl, publicUrl, fileName } = await supabaseStorage.getUploadUrl('videos', userId);
      
      // Extract the token from the signed URL
      const urlObj = new URL(uploadUrl);
      const token = urlObj.searchParams.get('token') || '';
      
      res.json({ uploadUrl, publicUrl, fileName, token });
    } catch (error: any) {
      console.error('Video upload URL error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/upload/video/sync - Sync the latest uploaded video to profile
  app.post("/api/upload/video/sync", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      const supabaseClient = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);
      const { data: files, error: listError } = await supabaseClient.storage
        .from('videos')
        .list(userId, {
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (listError) {
        throw new Error(`Failed to list video files: ${listError.message}`);
      }
      
      if (!files || files.length === 0) {
        return res.status(404).json({ error: 'No video files found' });
      }
      
      const latestFile = files[0];
      const publicUrl = `${supabaseConfig.url}/storage/v1/object/public/videos/${userId}/${latestFile.name}`;
      
      await storage.updateProfile(userId, { videoUrl: publicUrl });
      
      res.json({ 
        success: true, 
        videoUrl: publicUrl,
        fileName: latestFile.name 
      });
    } catch (error: any) {
      console.error('Video sync error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unified upload endpoint for all object types
  // POST /api/objects/upload - Upload files to any bucket with automatic profile saving
  app.post("/api/objects/upload", requireAuth, async (req: Request, res: Response) => {
    try {
      const { bucket, fileType, saveToProfile = false } = z.object({
        bucket: z.enum(['avatars', 'gallery', 'videos']),
        fileType: z.string().optional(),
        saveToProfile: z.boolean().optional()
      }).parse(req.body);

      const userId = req.user!.id;

      // Get signed upload URL using service role client
      const { uploadUrl, publicUrl, fileName } = await supabaseStorage.getUploadUrl(bucket, userId);

      // Extract the token from the signed URL (for compatibility with frontend)
      const urlObj = new URL(uploadUrl);
      const token = urlObj.searchParams.get('token') || '';

      // Optionally save URL to profile immediately
      // Note: This happens before actual upload, so frontend should handle upload completion
      if (saveToProfile) {
        const profile = await storage.getProfile(userId);
        if (profile) {
          let updateData: any = {};
          
          switch(bucket) {
            case 'avatars':
              updateData.avatarUrl = publicUrl;
              break;
            case 'gallery':
              // Add to gallery URLs array (max 3)
              const currentGallery = profile.galleryUrls || [];
              if (currentGallery.length < 3) {
                updateData.galleryUrls = [...currentGallery, publicUrl];
              }
              break;
            case 'videos':
              updateData.videoUrl = publicUrl;
              break;
          }
          
          if (Object.keys(updateData).length > 0) {
            await storage.updateProfile(userId, updateData);
          }
        }
      }

      // Prepare response
      const response = {
        uploadUrl,
        publicUrl,
        fileName,
        token,
        bucket,
        success: true
      };

      res.json(response);
    } catch (error: any) {
      console.error('Unified upload error:', error);
      res.status(500).json({ 
        error: error.message,
        success: false 
      });
    }
  });
  
  // Enhanced upload completion endpoint to save URLs after successful upload
  // POST /api/objects/upload/complete - Save uploaded file URL to profile
  app.post("/api/objects/upload/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      const { bucket, publicUrl } = z.object({
        bucket: z.enum(['avatars', 'gallery', 'videos']),
        publicUrl: z.string().url()
      }).parse(req.body);

      const userId = req.user!.id;
      const profile = await storage.getProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      let updateData: any = {};
      
      switch(bucket) {
        case 'avatars':
          updateData.avatarUrl = publicUrl;
          break;
        case 'gallery':
          // Add to gallery URLs array (max 3)
          const currentGallery = profile.galleryUrls || [];
          if (currentGallery.length < 3) {
            updateData.galleryUrls = [...currentGallery, publicUrl];
          } else {
            return res.status(400).json({ error: 'Gallery limit reached (max 3 images)' });
          }
          break;
        case 'videos':
          updateData.videoUrl = publicUrl;
          break;
      }
      
      const updatedProfile = await storage.updateProfile(userId, updateData);
      res.json({ 
        success: true, 
        profile: updatedProfile,
        message: `${bucket} URL saved to profile`
      });
    } catch (error: any) {
      console.error('Upload completion error:', error);
      res.status(500).json({ 
        error: error.message,
        success: false 
      });
    }
  });

  // Update profile with uploaded avatar URL
  app.put("/api/profile/avatar", requireAuth, async (req: Request, res: Response) => {
    const { avatarUrl } = z.object({
      avatarUrl: z.string().url()
    }).parse(req.body);

    const userId = req.user!.id;

    try {
      // Update profile with the Supabase Storage URL
      const profile = await storage.updateProfile(userId, {
        avatarUrl,
      });

      res.status(200).json(profile);
    } catch (error) {
      console.error("Error setting avatar:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update profile with uploaded video URL
  app.put("/api/profile/video", requireAuth, async (req: Request, res: Response) => {
    const { videoUrl } = z.object({
      videoUrl: z.string().url()
    }).parse(req.body);

    const userId = req.user!.id;

    try {
      // Update profile with the Supabase Storage URL
      const profile = await storage.updateProfile(userId, {
        videoUrl,
      });

      res.status(200).json(profile);
    } catch (error) {
      console.error("Error setting video:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update profile with gallery image URLs
  app.put("/api/profile/gallery", requireAuth, async (req: Request, res: Response) => {
    const { galleryUrls } = z.object({
      galleryUrls: z.array(z.string().url()).max(3, 'Maximum 3 gallery images allowed')
    }).parse(req.body);

    const userId = req.user!.id;

    try {
      // Update profile with the Supabase Storage URLs
      const profile = await storage.updateProfile(userId, {
        galleryUrls,
      });

      res.status(200).json(profile);
    } catch (error) {
      console.error("Error setting gallery images:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/profiles/:id - Get public profile by ID
  app.get('/api/profiles/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const profile = await storage.getProfile(id);
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(profile);
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(400).json({ error: error.message || 'Failed to get profile' });
    }
  });

  // PATCH /api/profiles/:id - Update profile by ID (protected - user can only update their own profile)
  app.patch('/api/profiles/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      console.log(`PATCH /api/profiles/${id} - userId: ${userId}, original updates:`, JSON.stringify(req.body, null, 2));
      
      // Verify user is updating their own profile
      if (id !== userId) {
        return res.status(403).json({ error: 'You can only update your own profile' });
      }
      
      // Parse and validate the update data
      const updates = req.body;
      
      // Handle field name variations (avatar vs avatarUrl)
      if (updates.avatar) {
        updates.avatarUrl = updates.avatar;
        delete updates.avatar;
      }
      
      // Handle other field mappings if needed
      if (updates.gallery) {
        updates.galleryUrls = updates.gallery;
        delete updates.gallery;
      }
      
      if (updates.video) {
        updates.videoUrl = updates.video;
        delete updates.video;
      }
      
      console.log(`PATCH /api/profiles/${id} - after field mapping:`, JSON.stringify(updates, null, 2));
      
      // Update the profile
      const profile = await storage.updateProfile(userId, updates);
      
      res.json(profile);
    } catch (error: any) {
      console.error('PATCH profile error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      res.status(400).json({ error: error.message || 'Failed to update profile' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
