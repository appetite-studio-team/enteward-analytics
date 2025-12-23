import { NextResponse } from 'next/server'
import { CONFIG } from '@/lib/appwrite'

export async function GET() {
  try {
    // Use database ID directly (already without prefix)
    const databaseId = CONFIG.databaseId.replace(/^database-/, '')
    const url = `${CONFIG.endpoint}/databases/${databaseId}/collections`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': CONFIG.projectId,
        'X-Appwrite-Key': CONFIG.apiKey || '',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Appwrite API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url,
      })
      throw new Error(`Appwrite API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

