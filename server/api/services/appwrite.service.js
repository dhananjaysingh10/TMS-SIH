import { Client, Storage, ID } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const appwriteEndpoint = process.env.APPWRITE_API_ENDPOINT || process.env.VITE_APPWRITE_API_END_POINT || 'https://cloud.appwrite.io/v1';
const appwriteProject = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;

const client = new Client()
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProject);

if (process.env.APPWRITE_API_KEY) {
  client.setKey(process.env.APPWRITE_API_KEY);
} else {
  console.warn('Warning: APPWRITE_API_KEY is not set.');
}

const storage = new Storage(client);

export const uploadToAppwrite = async (file, fileType = 'file') => {
  try {
    const bucketId = process.env.APPWRITE_BUCKET_ID || process.env.VITE_APPWRITE_BUCKET_ID;
    
    if (!bucketId) {
      throw new Error('Missing APPWRITE_BUCKET_ID environment variable');
    }
    
    const fileId = ID.unique();
    
    const response = await storage.createFile(
      bucketId,
      fileId,
      file
    );
    
    const endpoint = appwriteEndpoint.replace(/\/$/, '');
    
    // Use 'view' for direct viewing - this works for images, videos, PDFs
    // For download, you could use 'download' instead
    const fileUrl = `${endpoint}/storage/buckets/${bucketId}/files/${response.$id}/view?project=${appwriteProject}`;
    
    console.log('✅ File uploaded:', { 
      fileUrl, 
      mimeType: response.mimeType,
      fileName: response.name 
    });
    
    return {
      fileId: response.$id,
      fileUrl: fileUrl,
      fileName: response.name,
      fileSize: response.sizeOriginal,
      mimeType: response.mimeType
    };
  } catch (error) {
    console.error('Appwrite upload error:', error);
    throw new Error('Failed to upload file to Appwrite: ' + error.message);
  }
};

export const deleteFromAppwrite = async (fileId) => {
  try {
    const bucketId = process.env.APPWRITE_BUCKET_ID;
    await storage.deleteFile(bucketId, fileId);
    return true;
  } catch (error) {
    console.error('Appwrite delete error:', error);
    return false;
  }
};