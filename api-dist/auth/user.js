import { handleCors } from "../_lib/cors";
import { requireAuth } from "../_lib/auth";
import { storage } from "../_lib/database";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const profile = await storage.getProfile(auth.userId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }
    let practitionerData = null;
    if (profile.role === "practitioner") {
      practitionerData = await storage.getPractitioner(auth.userId);
    }
    res.json({
      id: auth.userId,
      profile,
      practitioner: practitionerData
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(400).json({ error: error.message || "Failed to get user data" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=user.js.map
