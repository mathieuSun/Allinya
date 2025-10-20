import { handleCors } from "../_lib/cors.js";
import { supabase } from "../_lib/supabase.js";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.body?.refresh_token) {
      token = req.body.refresh_token;
    }
    if (token) {
      const { error } = await supabase.auth.admin.signOut(token);
      if (error) {
        console.error("Logout error:", error);
      }
    }
    res.status(204).send("");
  } catch (error) {
    console.error("Logout error:", error);
    res.status(204).send("");
  }
}
export {
  handler as default
};
//# sourceMappingURL=logout.js.map
