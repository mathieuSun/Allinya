import { supabase } from './supabase.js';
// Storage operations interface
export const storage = {
    async getProfile(id) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            console.error('Error fetching profile:', error);
            return undefined;
        }
        return data;
    },
    async createProfile(profile) {
        const { data, error } = await supabase
            .from('profiles')
            .insert({
            ...profile,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    },
    async updateProfile(id, updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update({
            ...updates,
            updatedAt: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }
        return data;
    },
    async getPractitioner(userId) {
        const { data, error } = await supabase
            .from('practitioners')
            .select('*')
            .eq('"userId"', userId)
            .single();
        if (error) {
            console.error('Error fetching practitioner:', error);
            return undefined;
        }
        return data;
    },
    async createPractitioner(practitioner) {
        const { data, error } = await supabase
            .from('practitioners')
            .insert({
            ...practitioner,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    },
    async updatePractitioner(userId, updates) {
        const { data, error } = await supabase
            .from('practitioners')
            .update({
            ...updates,
            updatedAt: new Date().toISOString()
        })
            .eq('"userId"', userId)
            .select()
            .single();
        if (error) {
            console.error('Supabase updatePractitioner error:', error);
            throw error;
        }
        return data;
    },
    async getAllPractitioners() {
        const { data: practitioners, error: practError } = await supabase
            .from('practitioners')
            .select('*')
            .order('"isOnline"', { ascending: false })
            .order('rating', { ascending: false });
        if (practError) {
            console.error('Error fetching practitioners:', practError);
            throw practError;
        }
        if (!practitioners || practitioners.length === 0) {
            return [];
        }
        const userIds = practitioners
            .map((p) => p.userId)
            .filter((id) => id != null && id !== 'undefined');
        if (userIds.length === 0) {
            return [];
        }
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);
        if (profileError) {
            console.error('Error fetching profiles:', profileError);
            throw profileError;
        }
        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        const result = practitioners
            .filter((pract) => pract.userId != null && pract.userId !== 'undefined')
            .map((pract) => ({
            ...pract,
            profile: profileMap.get(pract.userId) || {}
        }));
        return result;
    },
    async getOnlinePractitioners() {
        const { data: practitioners, error: practError } = await supabase
            .from('practitioners')
            .select('*')
            .eq('"isOnline"', true);
        if (practError) {
            console.error('Error fetching online practitioners:', practError);
            throw practError;
        }
        if (!practitioners || practitioners.length === 0) {
            return [];
        }
        const userIds = practitioners
            .map((p) => p.userId)
            .filter((id) => id != null);
        if (userIds.length === 0) {
            return [];
        }
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);
        if (profileError) {
            console.error('Error fetching profiles:', profileError);
            throw profileError;
        }
        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
        const result = practitioners
            .filter((pract) => pract.userId != null)
            .map((pract) => ({
            ...pract,
            profile: profileMap.get(pract.userId) || {}
        }));
        return result;
    },
    async getPractitionerWithProfile(userId) {
        const practitioner = await this.getPractitioner(userId);
        if (!practitioner)
            return undefined;
        const profile = await this.getProfile(userId);
        if (!profile)
            return undefined;
        return {
            ...practitioner,
            profile
        };
    },
    async getSession(id) {
        const { data: session, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !session) {
            console.error('Error fetching session:', error);
            return undefined;
        }
        const guestProfile = await this.getProfile(session.guestId);
        const practitionerData = await this.getPractitionerWithProfile(session.practitionerId);
        return {
            ...session,
            guest: guestProfile,
            practitioner: practitionerData
        };
    },
    async getSessionsForPractitioner(practitionerId) {
        const { data: sessions, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('"practitionerId"', practitionerId)
            .order('"createdAt"', { ascending: false });
        if (error) {
            console.error('Error fetching sessions:', error);
            return [];
        }
        const sessionsWithParticipants = await Promise.all(sessions.map(async (session) => {
            const guestProfile = await this.getProfile(session.guestId);
            const practitionerData = await this.getPractitionerWithProfile(session.practitionerId);
            return {
                ...session,
                guest: guestProfile,
                practitioner: practitionerData
            };
        }));
        return sessionsWithParticipants;
    },
    async getActivePractitionerSessions(practitionerId) {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .eq('"practitionerId"', practitionerId)
            .in('phase', ['waiting', 'room_timer', 'live'])
            .order('"createdAt"', { ascending: false });
        if (error) {
            console.error('Error fetching active sessions for practitioner:', error);
            return [];
        }
        return data || [];
    },
    async createSession(session) {
        const { data, error } = await supabase
            .from('sessions')
            .insert({
            ...session,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    },
    async updateSession(id, updates) {
        const { data, error } = await supabase
            .from('sessions')
            .update({
            ...updates,
            updatedAt: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Supabase updateSession error:', error);
            throw error;
        }
        return data;
    },
    async createReview(review) {
        const { data, error } = await supabase
            .from('reviews')
            .insert({
            ...review,
            createdAt: new Date().toISOString()
        })
            .select()
            .single();
        if (error)
            throw error;
        return data;
    },
    async getSessionReviews(sessionId) {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('"sessionId"', sessionId);
        if (error) {
            console.error('Error fetching reviews:', error);
            return [];
        }
        return data || [];
    }
};
