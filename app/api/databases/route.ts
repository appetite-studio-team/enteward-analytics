import { NextResponse } from 'next/server'
import { CONFIG } from '@/lib/appwrite'

// Test endpoint to list all databases and find the correct ID
export async function GET() {
  try {
    const url = `${CONFIG.endpoint}/databases`
    
    console.log('Fetching databases from:', url)
    console.log('Project ID:', CONFIG.projectId)
    
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
      throw new Error(`Appwrite API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching databases:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch databases' },
      { status: 500 }
    )
  }
}



