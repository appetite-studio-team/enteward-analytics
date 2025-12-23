import { Client, Account } from 'appwrite'

// Appwrite REST API Configuration
export const CONFIG = {
  endpoint: 'https://appwrite-prod.cloud3.appetite.studio/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '677b965c00367b19d8a1',
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '66681e3f0001445f43af',
  // API key for server-side authentication (not exposed to client)
  apiKey: process.env.APPWRITE_API_KEY || ''
}

// Client-side Appwrite client for authentication
export const getAppwriteClient = () => {
  const client = new Client()
    .setEndpoint(CONFIG.endpoint)
    .setProject(CONFIG.projectId)
  
  return client
}

// Get Account instance for authentication
export const getAccount = () => {
  const client = getAppwriteClient()
  return new Account(client)
}

