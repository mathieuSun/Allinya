import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { supabaseConfig } from "./config.js";
const supabase = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
  db: {
    schema: "public"
  },
  global: {
    headers: {
      "Cache-Control": "no-cache",
      "Prefer": "return=representation"
    }
  }
});
const supabaseAdmin = createClient(
  supabaseConfig.url,
  supabaseConfig.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
class SupabaseStorageService {
  constructor() {
    this.client = supabaseAdmin;
  }
  /**
   * Get signed upload URL for a file
   * Returns both the upload URL and the final public URL
   */
  async getUploadUrl(bucket, userId) {
    const fileId = randomUUID();
    const fileName = `${userId}/${fileId}`;
    const { data, error } = await this.client.storage.from(bucket).createSignedUploadUrl(fileName);
    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message || "Unknown error"}`);
    }
    const { data: urlData } = this.client.storage.from(bucket).getPublicUrl(fileName);
    return {
      uploadUrl: data.signedUrl,
      publicUrl: urlData.publicUrl,
      fileName
    };
  }
  /**
   * Delete a file from storage
   */
  async deleteFile(bucket, fileName) {
    const { error } = await this.client.storage.from(bucket).remove([fileName]);
    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
  /**
   * Upload a file directly from server (for migrations or admin operations)
   */
  async uploadFile(bucket, fileName, file, contentType) {
    const { data, error } = await this.client.storage.from(bucket).upload(fileName, file, {
      contentType,
      upsert: true
    });
    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    const { data: urlData } = this.client.storage.from(bucket).getPublicUrl(fileName);
    return urlData.publicUrl;
  }
  /**
   * List files in a bucket for a specific user
   */
  async listUserFiles(bucket, userId) {
    const { data, error } = await this.client.storage.from(bucket).list(userId);
    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
    return (data || []).map((file) => {
      const { data: urlData } = this.client.storage.from(bucket).getPublicUrl(`${userId}/${file.name}`);
      return urlData.publicUrl;
    });
  }
  /**
   * Get public URL for an existing file
   */
  getPublicUrl(bucket, fileName) {
    const { data } = this.client.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  }
  /**
   * Initialize storage buckets on startup
   */
  async initializeBuckets() {
    const buckets = [
      { name: "avatars", public: true },
      { name: "gallery", public: true },
      { name: "videos", public: true }
    ];
    for (const bucket of buckets) {
      try {
        const { data: existingBucket } = await this.client.storage.getBucket(bucket.name);
        if (existingBucket) {
          console.log(`\u2139\uFE0F Storage bucket already exists: ${bucket.name}`);
          continue;
        }
        const { error } = await this.client.storage.createBucket(bucket.name, {
          public: bucket.public,
          // Don't set file size limits here - handle per upload
          allowedMimeTypes: bucket.name === "videos" ? ["video/mp4", "video/mpeg", "video/quicktime", "video/x-ms-wmv", "video/x-msvideo", "video/webm"] : ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
        });
        if (error) {
          console.error(`Failed to create bucket ${bucket.name}:`, error);
        } else {
          console.log(`\u2705 Storage bucket created: ${bucket.name}`);
        }
      } catch (error) {
        console.error(`Error handling bucket ${bucket.name}:`, error);
      }
    }
  }
}
const supabaseStorage = new SupabaseStorageService();
export {
  supabase,
  supabaseAdmin,
  supabaseStorage
};
//# sourceMappingURL=supabase.js.map
