import { handleCors } from "../_lib/cors.js";
import { requireAuth } from "../_lib/auth.js";
import { storage } from "../_lib/database.js";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { id, practitioner } = req.query;
    if (practitioner === "true") {
      const userId = auth.userId;
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== "practitioner") {
        return res.status(403).json({ error: "Only practitioners can access this endpoint" });
      }
      const sessions = await storage.getSessionsForPractitioner(userId);
      return res.json(sessions);
    }
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid session ID" });
    }
    const session = await storage.getSession(id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session);
  } catch (error) {
    console.error("Get session error:", error);
    res.status(400).json({ error: error.message || "Failed to get session" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=get.js.map
