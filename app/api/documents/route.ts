import { NextRequest, NextResponse } from 'next/server'
import { CONFIG } from '@/lib/appwrite'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const collectionId = searchParams.get('collectionId')

    if (!collectionId) {
      return NextResponse.json(
        { error: 'collectionId is required' },
        { status: 400 }
      )
    }

    // Extract database ID (remove 'database-' prefix if present)
    const databaseId = CONFIG.databaseId.replace(/^database-/, '')
    // Extract collection ID (remove 'collection-' prefix if present, but keep the ID as-is)
    const cleanCollectionId = collectionId.replace(/^collection-/, '')
    
    // Make direct API call to Appwrite REST API
    const url = `${CONFIG.endpoint}/databases/${databaseId}/collections/${cleanCollectionId}/documents`
    
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
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

