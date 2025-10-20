import { z } from "zod";
import { createRequire } from "module";
import { handleCors } from "../_lib/cors";
import { requireAuth } from "../_lib/auth";
import { agoraConfig } from "../_lib/config";
const require2 = createRequire(import.meta.url);
const AgoraToken = require2("agora-token");
const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;
const RtcRole = AgoraToken.RtcRole;
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { channel, uid } = z.object({
      channel: z.string(),
      uid: z.string()
    }).parse(req.query);
    const { appId, appCertificate } = agoraConfig;
    if (!appId || !appCertificate) {
      return res.status(500).json({ error: "Agora credentials not configured" });
    }
    const privilegeExpireTime = Math.floor(Date.now() / 1e3) + 3600;
    const agoraRole = RtcRole.PUBLISHER;
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      appCertificate,
      channel,
      uid,
      // Use string UID directly
      agoraRole,
      privilegeExpireTime
    );
    res.json({
      token,
      appId,
      uid
    });
  } catch (error) {
    console.error("Agora token error:", error);
    res.status(400).json({ error: error.message });
  }
}
export {
  handler as default
};
//# sourceMappingURL=token.js.map
