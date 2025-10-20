import { handleCors } from "../_lib/cors.js";
import { requireAuth } from "../_lib/auth.js";
import { storage } from "../_lib/database.js";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const updates = req.body;
    const profile = await storage.updateProfile(auth.userId, updates);
    res.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(400).json({ error: error.message || "Failed to update profile" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=update.js.map
