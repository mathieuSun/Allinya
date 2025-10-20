import { z } from "zod";
import { handleCors } from "../_lib/cors.js";
import { requireAuth } from "../_lib/auth.js";
import { storage } from "../_lib/database.js";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { sessionId } = z.object({
      sessionId: z.string().uuid()
    }).parse(req.body);
    const userId = auth.userId;
    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (userId !== session.guestId && userId !== session.practitionerId) {
      return res.status(403).json({ error: "Not a session participant" });
    }
    const updatedSession = await storage.updateSession(sessionId, {
      phase: "ended"
    });
    await storage.updatePractitioner(session.practitionerId, { inService: false });
    res.json(updatedSession);
  } catch (error) {
    console.error("End session error:", error);
    res.status(400).json({ error: error.message });
  }
}
export {
  handler as default
};
//# sourceMappingURL=end.js.map
