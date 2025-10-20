import { z } from "zod";
import { handleCors } from "../_lib/cors";
import { supabase } from "../_lib/supabase";
import { storage } from "../_lib/database";
async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { email, password, full_name, role } = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      full_name: z.string().min(1),
      role: z.enum(["guest", "practitioner"])
    }).parse(req.body);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name
        }
      }
    });
    if (authError) {
      return res.status(400).json({ error: authError.message });
    }
    if (!authData.user) {
      return res.status(400).json({ error: "Failed to create user" });
    }
    const profile = await storage.createProfile({
      id: authData.user.id,
      role,
      displayName: full_name,
      country: null,
      bio: null,
      avatarUrl: null,
      galleryUrls: [],
      videoUrl: null,
      specialties: []
    });
    if (role === "practitioner") {
      await storage.createPractitioner({
        userId: authData.user.id,
        isOnline: false,
        inService: false,
        rating: "0.0",
        reviewCount: 0
      });
    }
    res.json({
      user: authData.user,
      session: authData.session,
      access_token: authData.session?.access_token,
      profile
    });
  } catch (error) {
    console.error("Signup error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(400).json({ error: error.message || "Signup failed" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=signup.js.map
