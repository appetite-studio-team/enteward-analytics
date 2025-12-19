// Appwrite REST API Configuration
export const CONFIG = {
  endpoint: 'https://appwrite-prod.cloud3.appetite.studio/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '677b965c00367b19d8a1',
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '66681e3f0001445f43af',
  // API key for server-side authentication (not exposed to client)
  apiKey: process.env.APPWRITE_API_KEY || ''
}

