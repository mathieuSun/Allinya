import { BUILD_TIMESTAMP } from "./config";
function handleCors(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, private, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Accept-Encoding, Origin");
  const userAgent = req.headers["user-agent"] || "";
  if (userAgent.includes("WebKit") || userAgent.includes("iPad") || userAgent.includes("iPhone")) {
    res.setHeader("Clear-Site-Data", '"cache"');
    res.setHeader("X-iOS-Cache-Bust", BUILD_TIMESTAMP);
  }
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }
  return false;
}
export {
  handleCors
};
//# sourceMappingURL=cors.js.map
