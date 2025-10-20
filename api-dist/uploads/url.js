import { z } from "zod";
import { handleCors } from "../_lib/cors.js";
import { requireAuth } from "../_lib/auth.js";
import { supabaseStorage } from "../_lib/supabase.js";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { bucket } = z.object({
      bucket: z.enum(["avatars", "gallery", "videos"])
    }).parse(req.body);
    const result = await supabaseStorage.getUploadUrl(
      bucket,
      auth.userId
    );
    res.json(result);
  } catch (error) {
    console.error("Upload URL error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(400).json({ error: error.message || "Failed to generate upload URL" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=url.js.map
