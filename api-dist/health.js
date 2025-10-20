import { handleCors } from "./_lib/cors.js";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
export {
  handler as default
};
//# sourceMappingURL=health.js.map
