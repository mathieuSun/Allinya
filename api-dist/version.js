import { handleCors } from "./_lib/cors.js";
import { BUILD_TIMESTAMP, BUILD_VERSION } from "./_lib/config.js";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.json({
    timestamp: BUILD_TIMESTAMP,
    version: BUILD_VERSION,
    requiresReload: false
  });
}
export {
  handler as default
};
//# sourceMappingURL=version.js.map
