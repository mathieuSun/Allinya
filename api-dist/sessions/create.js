import { z } from "zod";
import { randomUUID } from "crypto";
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
    console.log("Session start request:", req.body);
    const { practitionerId, liveSeconds } = z.object({
      practitionerId: z.string().uuid(),
      liveSeconds: z.number().int().positive()
    }).parse(req.body);
    const guestId = auth.userId;
    console.log("Guest ID:", guestId, "Practitioner ID:", practitionerId);
    const guest = await storage.getProfile(guestId);
    if (!guest || guest.role !== "guest") {
      console.error("User is not a guest:", guest);
      return res.status(403).json({ error: "Only guests can start sessions" });
    }
    const practitioner = await storage.getPractitioner(practitionerId);
    console.log("Practitioner status:", practitioner);
    if (!practitioner || !practitioner.isOnline) {
      return res.status(400).json({ error: "Practitioner is not available" });
    }
    const sessionId = randomUUID();
    const agoraChannel = `sess_${sessionId.substring(0, 8)}`;
    console.log("Creating session with ID:", sessionId);
    const session = await storage.createSession({
      practitionerId,
      guestId,
      phase: "waiting",
      liveSeconds,
      practitionerReady: false,
      guestReady: false,
      acknowledgedPractitioner: false,
      agoraChannel
    });
    console.log("Session created:", session);
    await storage.updatePractitioner(practitionerId, { inService: true });
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(400).json({ error: error.message });
  }
}
export {
  handler as default
};
//# sourceMappingURL=create.js.map
