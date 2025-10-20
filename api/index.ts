// Single catch-all API handler for all routes
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import all route handlers
import healthHandler from './health';
import versionHandler from './version';
import cacheBustHandler from './cache-bust';

// Auth routes
import signupHandler from './auth/signup';
import loginHandler from './auth/login';
import logoutHandler from './auth/logout';
import userHandler from './auth/user';

// Profile routes
import profileHandler from './profile/index';

// Practitioner routes
import practitionersListHandler from './practitioners/list';
import practitionerDetailHandler from './practitioners/[id]';
import practitionerOnlineHandler from './practitioners/online';
import practitionerToggleStatusHandler from './practitioners/toggle-status';

// Session routes
import sessionDetailHandler from './sessions/[id]';
import sessionStartHandler from './sessions/start';
import sessionAcceptHandler from './sessions/accept';
import sessionAcknowledgeHandler from './sessions/acknowledge';
import sessionReadyHandler from './sessions/ready';
import sessionRejectHandler from './sessions/reject';
import sessionEndHandler from './sessions/end';
import sessionPractitionerHandler from './sessions/practitioner';

// Review routes
import reviewCreateHandler from './reviews/create';
import reviewSessionHandler from './reviews/[sessionId]';

// Upload routes
import uploadUrlHandler from './uploads/url';

// Agora route
import agoraTokenHandler from './agora/token';

// Helper function to parse JSON body
async function parseBody(req: VercelRequest): Promise<any> {
  if (!req.body) return null;
  
  // If body is already parsed (shouldn't happen in Vercel, but just in case)
  if (typeof req.body === 'object' && !(req.body instanceof Buffer)) {
    return req.body;
  }
  
  // Parse string body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      console.error('Failed to parse string body:', e);
      return req.body;
    }
  }
  
  // Parse Buffer body
  if (req.body instanceof Buffer) {
    try {
      const bodyString = req.body.toString('utf-8');
      return JSON.parse(bodyString);
    } catch (e) {
      console.error('Failed to parse buffer body:', e);
      return req.body.toString('utf-8');
    }
  }
  
  // For streams (ReadableStream), read and parse
  if (req.body && typeof req.body.pipe === 'function') {
    return new Promise((resolve, reject) => {
      let data = '';
      req.body.on('data', chunk => {
        data += chunk.toString();
      });
      req.body.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          console.error('Failed to parse stream body:', e);
          resolve(data);
        }
      });
      req.body.on('error', reject);
    });
  }
  
  return req.body;
}

// Helper function to parse cookies
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(value || '');
  });
  
  return cookies;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, method } = req;
  const path = url?.replace(/^\/api/, '') || '';
  
  // Parse body for POST, PUT, PATCH requests BEFORE delegating to handlers
  // This is critical because Vercel provides raw streams but handlers expect parsed JSON
  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    try {
      req.body = await parseBody(req);
      console.log(`Parsed body for ${method} ${path}:`, req.body);
    } catch (error) {
      console.error('Error parsing body:', error);
      return res.status(400).json({ error: 'Invalid request body' });
    }
  }
  
  // Parse cookies and attach to request for session management
  const cookies = parseCookies(req.headers.cookie);
  (req as any).cookies = cookies;

  try {
    // Health check
    if (path === '/health') {
      return healthHandler(req, res);
    }
    
    // Version check
    if (path === '/version') {
      return versionHandler(req, res);
    }
    
    // Cache bust
    if (path === '/cache-bust') {
      return cacheBustHandler(req, res);
    }

    // Auth routes
    if (path === '/auth/signup' && method === 'POST') {
      return signupHandler(req, res);
    }
    if (path === '/auth/login' && method === 'POST') {
      return loginHandler(req, res);
    }
    if (path === '/auth/logout' && method === 'POST') {
      return logoutHandler(req, res);
    }
    if (path === '/auth/user' && method === 'GET') {
      return userHandler(req, res);
    }

    // Profile routes
    if (path === '/profile' && (method === 'GET' || method === 'PUT')) {
      return profileHandler(req, res);
    }

    // Practitioners routes
    if (path === '/practitioners' && method === 'GET') {
      return practitionersListHandler(req, res);
    }
    if (path === '/practitioners/online' && method === 'GET') {
      return practitionerOnlineHandler(req, res);
    }
    if (path === '/practitioners/toggle-status' && method === 'PUT') {
      return practitionerToggleStatusHandler(req, res);
    }
    
    const practitionerMatch = path.match(/^\/practitioners\/([^\/]+)$/);
    if (practitionerMatch) {
      const [, id] = practitionerMatch;
      req.query = { ...req.query, id };
      
      if (method === 'GET') {
        return practitionerDetailHandler(req, res);
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Sessions routes
    if (path === '/sessions/start' && method === 'POST') {
      return sessionStartHandler(req, res);
    }
    if (path === '/sessions/accept' && method === 'POST') {
      return sessionAcceptHandler(req, res);
    }
    if (path === '/sessions/acknowledge' && method === 'POST') {
      return sessionAcknowledgeHandler(req, res);
    }
    if (path === '/sessions/ready' && method === 'POST') {
      return sessionReadyHandler(req, res);
    }
    if (path === '/sessions/reject' && method === 'POST') {
      return sessionRejectHandler(req, res);
    }
    if (path === '/sessions/end' && method === 'POST') {
      return sessionEndHandler(req, res);
    }
    if (path === '/sessions/practitioner' && method === 'GET') {
      return sessionPractitionerHandler(req, res);
    }
    
    const sessionMatch = path.match(/^\/sessions\/([^\/]+)$/);
    if (sessionMatch) {
      const [, id] = sessionMatch;
      req.query = { ...req.query, id };
      
      if (method === 'GET') {
        return sessionDetailHandler(req, res);
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Reviews routes
    if (path === '/reviews/create' && method === 'POST') {
      return reviewCreateHandler(req, res);
    }
    
    const reviewSessionMatch = path.match(/^\/reviews\/([^\/]+)$/);
    if (reviewSessionMatch && method === 'GET') {
      const [, sessionId] = reviewSessionMatch;
      req.query = { ...req.query, sessionId };
      return reviewSessionHandler(req, res);
    }

    // Upload routes
    if (path === '/uploads/url' && method === 'POST') {
      return uploadUrlHandler(req, res);
    }

    // Agora token
    if (path === '/agora/token' && method === 'POST') {
      return agoraTokenHandler(req, res);
    }

    // 404 for unmatched routes
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}