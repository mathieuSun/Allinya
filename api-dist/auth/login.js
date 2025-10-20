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
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(req.body);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (authError) {
      return res.status(401).json({ error: authError.message });
    }
    if (!authData.user || !authData.session) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    let profile = await storage.getProfile(authData.user.id);
    if (!profile) {
      console.log(`No profile found for ${email}, auto-creating based on email...`);
      const role = email === "chefmat2018@gmail.com" ? "practitioner" : email === "cheekyma@hotmail.com" ? "guest" : "guest";
      const displayName = email.split("@")[0].replace(/[0-9]/g, "").replace(/[._-]/g, " ");
      profile = await storage.createProfile({
        id: authData.user.id,
        role,
        displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        country: null,
        bio: null,
        avatarUrl: null,
        galleryUrls: [],
        videoUrl: null,
        specialties: []
      });
      if (role === "practitioner") {
        console.log("Creating practitioner record for", email);
        await storage.createPractitioner({
          userId: authData.user.id,
          isOnline: false,
          inService: false,
          rating: "0.0",
          reviewCount: 0
        });
      }
      console.log(`Profile auto-created for ${email} with role: ${role}`);
    }
    res.json({
      user: authData.user,
      session: authData.session,
      access_token: authData.session.access_token,
      profile
    });
  } catch (error) {
    console.error("Login error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(401).json({ error: error.message || "Login failed" });
  }
}
export {
  handler as default
};
//# sourceMappingURL=login.js.map
