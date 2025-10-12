import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createRequire } from "module";

// Import Agora token builder (CommonJS module)
const require = createRequire(import.meta.url);
const AgoraToken = require("agora-token");
const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;
const Role = AgoraToken.Role;

export async function registerRoutes(app: Express): Promise<Server> {
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
          online: false,
          inService: false,
          rating: '0.0',
          reviewCount: 0,
        });
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

      const profile = await storage.updateProfile(userId, updates);
      res.json(profile);
    } catch (error: any) {
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

      const practitioner = await storage.updatePractitioner(userId, { online });
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

  // POST /api/sessions/start - Start a new session
  app.post('/api/sessions/start', requireAuth, async (req: Request, res: Response) => {
    try {
      const { practitionerId, liveSeconds } = z.object({
        practitionerId: z.string().uuid(),
        liveSeconds: z.number().int().positive(),
      }).parse(req.body);

      const guestId = req.user!.id;

      // Verify guest role
      const guest = await storage.getProfile(guestId);
      if (!guest || guest.role !== 'guest') {
        return res.status(403).json({ error: 'Only guests can start sessions' });
      }

      // Verify practitioner exists and is online
      const practitioner = await storage.getPractitioner(practitionerId);
      if (!practitioner || !practitioner.online) {
        return res.status(400).json({ error: 'Practitioner is not available' });
      }

      // Create session
      const sessionId = randomUUID();
      const agoraChannel = `sess_${sessionId.substring(0, 8)}`;
      
      const session = await storage.createSession({
        practitioner_id: practitionerId,
        guest_id: guestId,
        is_group: false,
        phase: 'waiting',
        waiting_seconds: 300,
        live_seconds: liveSeconds,
        waiting_started_at: new Date(),
        live_started_at: null,
        ended_at: null,
        agora_channel: agoraChannel,
        agora_uid_practitioner: `p_${randomUUID().substring(0, 8)}`,
        agora_uid_guest: `g_${randomUUID().substring(0, 8)}`,
        ready_practitioner: false,
        ready_guest: false,
      });

      // Mark practitioner as in service
      await storage.updatePractitioner(practitionerId, { in_service: true });

      res.json({ sessionId: session.id });
    } catch (error: any) {
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
      if (userId !== session.guest_id && userId !== session.practitioner_id) {
        return res.status(403).json({ error: 'Not a session participant' });
      }

      const updates: Partial<typeof session> = {};
      
      if (who === 'guest') {
        updates.ready_guest = true;
      } else {
        updates.ready_practitioner = true;
      }

      // Check if both ready, transition to live
      const bothReady = (who === 'guest' ? true : session.ready_guest) && 
                        (who === 'practitioner' ? true : session.ready_practitioner);

      if (bothReady && session.phase === 'waiting') {
        updates.phase = 'live';
        updates.live_started_at = new Date();
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
      if (userId !== session.guest_id && userId !== session.practitioner_id) {
        return res.status(403).json({ error: 'Not a session participant' });
      }

      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
      if (userId !== session.guest_id && userId !== session.practitioner_id) {
        return res.status(403).json({ error: 'Not a session participant' });
      }

      const updatedSession = await storage.updateSession(sessionId, {
        phase: 'ended',
        ended_at: new Date(),
      });

      // Mark practitioner as not in service
      await storage.updatePractitioner(session.practitioner_id, { in_service: false });

      res.json(updatedSession);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // GET /api/agora/token - Generate Agora RTC token
  app.get('/api/agora/token', requireAuth, async (req: Request, res: Response) => {
    try {
      const { channel, role, uid } = z.object({
        channel: z.string(),
        role: z.enum(['host', 'audience']),
        uid: z.string(),
      }).parse(req.query);

      const userId = req.user!.id;

      // Find session by channel
      // In a real implementation, you'd query sessions by agoraChannel
      // For now, we'll trust the request is valid since we verify user is authenticated

      const appId = process.env.AGORA_APP_ID;
      const appCertificate = process.env.AGORA_APP_CERTIFICATE;

      if (!appId || !appCertificate) {
        return res.status(500).json({ error: 'Agora credentials not configured' });
      }

      const privilegeExpireTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const agoraRole = role === 'host' ? Role.PUBLISHER : Role.SUBSCRIBER;

      const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channel,
        0, // Use 0 for string UIDs
        agoraRole,
        privilegeExpireTime
      );

      res.json({ token });
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
      if (userId !== session.guest_id) {
        return res.status(403).json({ error: 'Only guests can submit reviews' });
      }

      const review = await storage.createReview({
        session_id: sessionId,
        guest_id: userId,
        practitioner_id: session.practitioner_id,
        rating,
        comment: comment || null,
      });

      res.json(review);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
