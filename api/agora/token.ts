import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { createRequire } from "module";
import { handleCors } from '../_lib/cors.js';
import { requireAuth } from '../_lib/auth.js';
import { agoraConfig } from '../_lib/config.js';

// Import Agora token builder (CommonJS module)
const require = createRequire(import.meta.url);
const AgoraToken = require("agora-token");
const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;
const RtcRole = AgoraToken.RtcRole;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    
    const { channel, uid } = z.object({
      channel: z.string(),
      uid: z.string(),
    }).parse(req.query);

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
    console.error('Agora token error:', error);
    res.status(400).json({ error: error.message });
  }
}