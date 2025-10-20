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
    const existingPractitioner = await storage.getPractitioner(auth.userId);
    if (!existingPractitioner) {
      return res.status(404).json({ error: "Practitioner not found" });
    }
    const updates = req.body;
    const practitioner = await storage.updatePractitioner(auth.userId, updates);
    res.json(practitioner);
  } catch (error) {
    console.error("Update practitioner error:", error);
    res.status(400).json({ error: error.message || "Failed to update practitioner" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=update.js.map
