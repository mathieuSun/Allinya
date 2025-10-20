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
    const body = z.object({
      sessionId: z.string().uuid(),
      action: z.enum(["accept", "acknowledge", "ready", "reject"]).optional()
    }).parse(req.body);
    const sessionId = body.sessionId;
    const action = body.action || "accept";
    const userId = auth.userId;
    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    switch (action) {
      case "acknowledge":
        if (userId !== session.practitionerId) {
          return res.status(403).json({ error: "Only the practitioner can acknowledge the session" });
        }
        if (session.phase !== "waiting") {
          return res.status(400).json({ error: "Session is not in waiting phase" });
        }
        const acknowledgedSession = await storage.updateSession(sessionId, {
          acknowledgedPractitioner: true
        });
        res.json({
          success: true,
          message: "Session acknowledged. Guest has been notified.",
          session: acknowledgedSession
        });
        break;
      case "ready":
        const isGuest = userId === session.guestId;
        const isPractitioner = userId === session.practitionerId;
        if (!isGuest && !isPractitioner) {
          return res.status(403).json({ error: "Not a session participant" });
        }
        if (isPractitioner && !session.acknowledgedPractitioner) {
          return res.status(400).json({
            error: "Please acknowledge the session request first"
          });
        }
        const updates = {};
        if (isGuest) {
          updates.readyGuest = true;
        } else {
          updates.readyPractitioner = true;
        }
        const bothReady = isGuest ? session.readyPractitioner === true : session.readyGuest === true;
        if (bothReady && session.phase === "waiting") {
          updates.phase = "live";
          updates.liveStartedAt = (/* @__PURE__ */ new Date()).toISOString();
          console.log(`Session ${sessionId} auto-transitioning to live phase - both parties ready`);
        }
        const readySession = await storage.updateSession(sessionId, updates);
        res.json(readySession);
        break;
      case "reject":
        if (userId !== session.practitionerId) {
          return res.status(403).json({ error: "Only the practitioner can reject the session" });
        }
        if (session.phase !== "waiting") {
          return res.status(400).json({ error: "Session is not in waiting phase" });
        }
        const rejectedSession = await storage.updateSession(sessionId, {
          phase: "ended"
        });
        await storage.updatePractitioner(session.practitionerId, { inService: false });
        res.json(rejectedSession);
        break;
      case "accept":
      default:
        if (userId !== session.practitionerId) {
          return res.status(403).json({ error: "Only the practitioner can accept the session" });
        }
        if (session.phase !== "waiting") {
          return res.status(400).json({ error: "Session is not in waiting phase" });
        }
        const acceptedSession = await storage.updateSession(sessionId, {
          acknowledgedPractitioner: true,
          readyPractitioner: true
        });
        res.json(acceptedSession);
        break;
    }
  } catch (error) {
    console.error("Session action error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(400).json({ error: error.message || "Failed to process session action" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=accept.js.map
