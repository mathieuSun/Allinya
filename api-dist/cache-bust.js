import { handleCors } from "./_lib/cors.js";
import { BUILD_TIMESTAMP, BUILD_VERSION } from "./_lib/config.js";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const versionInfo = {
    buildTimestamp: BUILD_TIMESTAMP,
    version: BUILD_VERSION,
    serverTime: Date.now(),
    cacheClear: true,
    message: "Cache cleared - please reload",
    userAgent: req.headers["user-agent"] || "unknown"
  };
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  res.setHeader("X-Force-Reload", "true");
  res.json(versionInfo);
}
export {
  handler as default
};
//# sourceMappingURL=cache-bust.js.map
