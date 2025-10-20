function toSnakeCase(obj) {
  if (obj === null || obj === void 0) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== "object") return obj;
  const converted = {};
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    converted[snakeKey] = toSnakeCase(obj[key]);
  }
  return converted;
}
function toCamelCase(obj) {
  if (obj === null || obj === void 0) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== "object") return obj;
  const converted = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    converted[camelKey] = toCamelCase(obj[key]);
  }
  return converted;
}
async function parseBody(req) {
  if (!req.body) return null;
  if (typeof req.body === "object" && !(req.body instanceof Buffer)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      console.error("Failed to parse string body:", e);
      return req.body;
    }
  }
  if (req.body instanceof Buffer) {
    try {
      const bodyString = req.body.toString("utf-8");
      return JSON.parse(bodyString);
    } catch (e) {
      console.error("Failed to parse buffer body:", e);
      return req.body.toString("utf-8");
    }
  }
  if (req.body && typeof req.body.pipe === "function") {
    return new Promise((resolve, reject) => {
      let data = "";
      req.body.on("data", (chunk) => {
        data += chunk.toString();
      });
      req.body.on("end", () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          console.error("Failed to parse stream body:", e);
          resolve(data);
        }
      });
      req.body.on("error", reject);
    });
  }
  return req.body;
}
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value || "");
  });
  return cookies;
}
export {
  parseBody,
  parseCookies,
  toCamelCase,
  toSnakeCase
};
//# sourceMappingURL=helpers.js.map
