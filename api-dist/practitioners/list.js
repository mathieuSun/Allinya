import { handleCors } from "../_lib/cors";
import { storage } from "../_lib/database";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const onlineOnly = req.query.online === "true";
    const practitioners = onlineOnly ? await storage.getOnlinePractitioners() : await storage.getAllPractitioners();
    res.json(practitioners);
  } catch (error) {
    console.error("Get practitioners error:", error);
    res.status(400).json({ error: error.message || "Failed to get practitioners" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=list.js.map
