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
    const { sessionId, rating, comment } = z.object({
      sessionId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional()
    }).parse(req.body);
    const guestId = auth.userId;
    const session = await storage.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.guestId !== guestId) {
      return res.status(403).json({ error: "Only the session guest can create a review" });
    }
    if (session.phase !== "ended") {
      return res.status(400).json({ error: "Can only review completed sessions" });
    }
    const review = await storage.createReview({
      sessionId,
      guestId,
      practitionerId: session.practitionerId,
      rating,
      comment: comment || null
    });
    const reviews = await storage.getSessionReviews(session.practitionerId);
    const avgRating = reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length;
    await storage.updatePractitioner(session.practitionerId, {
      rating: avgRating.toFixed(1),
      reviewCount: reviews.length
    });
    res.json(review);
  } catch (error) {
    console.error("Create review error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(400).json({ error: error.message || "Failed to create review" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=create.js.map
