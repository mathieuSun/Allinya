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
    const existing = await storage.getPractitioner(auth.userId);
    if (existing) {
      return res.status(400).json({ error: "Practitioner record already exists" });
    }
    const practitioner = await storage.createPractitioner({
      userId: auth.userId,
      isOnline: false,
      inService: false,
      rating: "0.0",
      reviewCount: 0
    });
    await storage.updateProfile(auth.userId, { role: "practitioner" });
    res.json(practitioner);
  } catch (error) {
    console.error("Create practitioner error:", error);
    res.status(400).json({ error: error.message || "Failed to create practitioner" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=create.js.map
