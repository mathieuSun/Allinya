import { supabase } from "./supabase";
import { toSnakeCase, toCamelCase } from "./helpers";
const storage = {
  async getProfile(id) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) {
      console.error("Error fetching profile:", error);
      return void 0;
    }
    return toCamelCase(data);
  },
  async createProfile(profile) {
    const snakeCaseProfile = toSnakeCase(profile);
    const { data, error } = await supabase.from("profiles").insert({
      ...snakeCaseProfile,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  async updateProfile(id, updates) {
    const snakeCaseUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from("profiles").update({
      ...snakeCaseUpdates,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id).select().single();
    if (error) {
      console.error("Supabase update error:", error);
      throw error;
    }
    return toCamelCase(data);
  },
  async getPractitioner(userId) {
    const { data, error } = await supabase.from("practitioners").select("*").eq("user_id", userId).single();
    if (error) {
      console.error("Error fetching practitioner:", error);
      return void 0;
    }
    return toCamelCase(data);
  },
  async createPractitioner(practitioner) {
    const snakeCasePractitioner = toSnakeCase(practitioner);
    const { data, error } = await supabase.from("practitioners").insert({
      ...snakeCasePractitioner,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  async updatePractitioner(userId, updates) {
    const snakeCaseUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from("practitioners").update({
      ...snakeCaseUpdates,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("user_id", userId).select().single();
    if (error) {
      console.error("Supabase updatePractitioner error:", error);
      throw error;
    }
    return toCamelCase(data);
  },
  async getAllPractitioners() {
    const { data: practitioners, error: practError } = await supabase.from("practitioners").select("*").order("is_online", { ascending: false }).order("rating", { ascending: false });
    if (practError) {
      console.error("Error fetching practitioners:", practError);
      throw practError;
    }
    if (!practitioners || practitioners.length === 0) {
      return [];
    }
    const userIds = practitioners.map((p) => p.user_id).filter((id) => id != null && id !== "undefined");
    if (userIds.length === 0) {
      return [];
    }
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("*").in("id", userIds);
    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const result = practitioners.filter((pract) => pract.user_id != null && pract.user_id !== "undefined").map((pract) => ({
      ...toCamelCase(pract),
      profile: toCamelCase(profileMap.get(pract.user_id) || {})
    }));
    return result;
  },
  async getOnlinePractitioners() {
    const { data: practitioners, error: practError } = await supabase.from("practitioners").select("*").eq("is_online", true);
    if (practError) {
      console.error("Error fetching online practitioners:", practError);
      throw practError;
    }
    if (!practitioners || practitioners.length === 0) {
      return [];
    }
    const userIds = practitioners.map((p) => p.user_id).filter((id) => id != null);
    if (userIds.length === 0) {
      return [];
    }
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("*").in("id", userIds);
    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    const result = practitioners.filter((pract) => pract.user_id != null).map((pract) => ({
      ...toCamelCase(pract),
      profile: toCamelCase(profileMap.get(pract.user_id) || {})
    }));
    return result;
  },
  async getPractitionerWithProfile(userId) {
    const practitioner = await this.getPractitioner(userId);
    if (!practitioner) return void 0;
    const profile = await this.getProfile(userId);
    if (!profile) return void 0;
    return {
      ...practitioner,
      profile
    };
  },
  async getSession(id) {
    const { data: session, error } = await supabase.from("sessions").select("*").eq("id", id).single();
    if (error || !session) {
      console.error("Error fetching session:", error);
      return void 0;
    }
    const guestProfile = await this.getProfile(session.guest_id);
    const practitionerData = await this.getPractitionerWithProfile(session.practitioner_id);
    return {
      ...toCamelCase(session),
      guest: guestProfile,
      practitioner: practitionerData
    };
  },
  async getSessionsForPractitioner(practitionerId) {
    const { data: sessions, error } = await supabase.from("sessions").select("*").eq("practitioner_id", practitionerId).order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching sessions:", error);
      return [];
    }
    const sessionsWithParticipants = await Promise.all(
      sessions.map(async (session) => {
        const guestProfile = await this.getProfile(session.guest_id);
        const practitionerData = await this.getPractitionerWithProfile(session.practitioner_id);
        return {
          ...toCamelCase(session),
          guest: guestProfile,
          practitioner: practitionerData
        };
      })
    );
    return sessionsWithParticipants;
  },
  async createSession(session) {
    const snakeCaseSession = toSnakeCase(session);
    const { data, error } = await supabase.from("sessions").insert({
      ...snakeCaseSession,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  async updateSession(id, updates) {
    const snakeCaseUpdates = toSnakeCase(updates);
    const { data, error } = await supabase.from("sessions").update({
      ...snakeCaseUpdates,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id).select().single();
    if (error) {
      console.error("Supabase updateSession error:", error);
      throw error;
    }
    return toCamelCase(data);
  },
  async createReview(review) {
    const snakeCaseReview = toSnakeCase(review);
    const { data, error } = await supabase.from("reviews").insert({
      ...snakeCaseReview,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select().single();
    if (error) throw error;
    return toCamelCase(data);
  },
  async getSessionReviews(sessionId) {
    const { data, error } = await supabase.from("reviews").select("*").eq("session_id", sessionId);
    if (error) {
      console.error("Error fetching reviews:", error);
      return [];
    }
    return (data || []).map(toCamelCase);
  }
};
export {
  storage
};
//# sourceMappingURL=database.js.map
