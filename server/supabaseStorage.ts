import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';
import { randomUUID } from 'crypto';

// Create Supabase admin client with service role key for storage operations
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

export type StorageBucket = 'avatars' | 'gallery' | 'videos';

export class SupabaseStorageService {
  private client: SupabaseClient;
  
  constructor() {
    this.client = supabaseAdmin;
  }

  /**
   * Initialize storage buckets if they don't exist
   * Makes buckets public for read access
   */
  async initializeBuckets(): Promise<void> {
    const buckets: StorageBucket[] = ['avatars', 'gallery', 'videos'];
    
    for (const bucketName of buckets) {
      try {
        // Check if bucket exists
        const { data: existingBucket } = await this.client
          .storage
          .getBucket(bucketName);
        
        if (!existingBucket) {
          // Create bucket with public read access
          const { error } = await this.client.storage.createBucket(bucketName, {
            public: true,
            allowedMimeTypes: bucketName === 'videos' 
              ? ['video/mp4', 'video/webm', 'video/ogg']
              : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
            fileSizeLimit: bucketName === 'videos' ? 104857600 : 10485760 // 100MB for videos, 10MB for images
          });
          
          if (error) {
            console.error(`Error creating bucket ${bucketName}:`, error);
          } else {
            console.log(`✅ Created storage bucket: ${bucketName}`);
          }
        } else {
          console.log(`✓ Storage bucket exists: ${bucketName}`);
        }
      } catch (error) {
        console.error(`Error checking bucket ${bucketName}:`, error);
      }
    }
  }

  /**
   * Get signed upload URL for a file
   * Returns both the upload URL and the final public URL
   */
  async getUploadUrl(
    bucket: StorageBucket,
    userId: string
  ): Promise<{ uploadUrl: string; publicUrl: string; fileName: string }> {
    // Generate unique filename with user ID prefix
    const fileId = randomUUID();
    const fileName = `${userId}/${fileId}`;
    
    // Create signed upload URL (valid for 15 minutes)
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUploadUrl(fileName);
    
    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message || 'Unknown error'}`);
    }
    
    // Get the public URL that will be accessible after upload
    const { data: urlData } = this.client.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return {
      uploadUrl: data.signedUrl,
      publicUrl: urlData.publicUrl,
      fileName
    };
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: StorageBucket, fileName: string): Promise<void> {
    const { error } = await this.client.storage
      .from(bucket)
      .remove([fileName]);
    
    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Upload a file directly from server (for migrations or admin operations)
   */
  async uploadFile(
    bucket: StorageBucket,
    fileName: string,
    file: Buffer | Blob,
    contentType: string
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType,
        upsert: true
      });
    
    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    
    // Get public URL
    const { data: urlData } = this.client.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  }

  /**
   * List files in a bucket for a specific user
   */
  async listUserFiles(bucket: StorageBucket, userId: string): Promise<string[]> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .list(userId);
    
    if (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
    
    return (data || []).map(file => {
      const { data: urlData } = this.client.storage
        .from(bucket)
        .getPublicUrl(`${userId}/${file.name}`);
      return urlData.publicUrl;
    });
  }

  /**
   * Get public URL for an existing file
   */
  getPublicUrl(bucket: StorageBucket, fileName: string): string {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  }

  /**
   * Initialize storage buckets on startup
   */
  async initializeBuckets(): Promise<void> {
    const buckets: Array<{ name: StorageBucket, public: boolean }> = [
      { name: 'avatars', public: true },
      { name: 'gallery', public: true },
      { name: 'videos', public: true }
    ];

    for (const bucket of buckets) {
      try {
        // First check if bucket exists
        const { data: existingBucket } = await this.client.storage.getBucket(bucket.name);
        
        if (existingBucket) {
          console.log(`ℹ️ Storage bucket already exists: ${bucket.name}`);
          continue;
        }
        
        // Create the bucket with appropriate settings
        const { error } = await this.client.storage
          .createBucket(bucket.name, { 
            public: bucket.public,
            // Don't set file size limits here - handle per upload
            allowedMimeTypes: bucket.name === 'videos' 
              ? ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-ms-wmv', 'video/x-msvideo', 'video/webm']
              : ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
          });
        
        if (!error) {
          console.log(`✅ Created storage bucket: ${bucket.name}`);
        } else {
          console.error(`Error creating bucket ${bucket.name}:`, error);
        }
      } catch (err) {
        // If error is about bucket already existing, that's fine
        if (err && typeof err === 'object' && 'message' in err) {
          const message = (err as any).message;
          if (message?.includes('already exists')) {
            console.log(`ℹ️ Storage bucket already exists: ${bucket.name}`);
          } else {
            console.error(`Error initializing bucket ${bucket.name}:`, err);
          }
        }
      }
    }
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();