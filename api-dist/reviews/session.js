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
    const { sessionId } = req.query;
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "Invalid session ID" });
    }
    const reviews = await storage.getSessionReviews(sessionId);
    res.json(reviews);
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(400).json({ error: error.message || "Failed to get reviews" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=session.js.map
