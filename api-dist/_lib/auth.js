import { supabase } from "./supabase.js";
async function requireAuth(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return null;
    }
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: "Invalid token" });
      return null;
    }
    return { userId: user.id };
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
}
export {
  requireAuth
};
//# sourceMappingURL=auth.js.map
