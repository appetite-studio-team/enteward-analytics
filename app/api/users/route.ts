import { NextRequest, NextResponse } from 'next/server'
import { CONFIG } from '@/lib/appwrite'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const collectionId = '68a6fb880033d2da5bd8'
    
    // Extract database ID (remove 'database-' prefix if present)
    const databaseId = CONFIG.databaseId.replace(/^database-/, '')
    // Extract collection ID (remove 'collection-' prefix if present)
    const cleanCollectionId = collectionId.replace(/^collection-/, '')

    // Fetch all documents using offset-based pagination
    let allDocuments: any[] = []
    const limit = 100 // Appwrite max per request
    let offset = 0
    let totalDocuments = 0
    let hasMore = true
    let attempts = 0
    const maxAttempts = 100 // Safety limit
    
    while (hasMore && attempts < maxAttempts) {
      attempts++
      
      // Build URL with properly formatted queries
      const urlObj = new URL(`${CONFIG.endpoint}/databases/${databaseId}/collections/${cleanCollectionId}/documents`)
      
      // Create query objects as JSON strings
      const limitQuery = JSON.stringify({ method: 'limit', values: [limit] })
      urlObj.searchParams.append('queries[]', limitQuery)
      
      if (offset > 0) {
        const offsetQuery = JSON.stringify({ method: 'offset', values: [offset] })
        urlObj.searchParams.append('queries[]', offsetQuery)
      }
      
      const url = urlObj.toString()
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': CONFIG.projectId,
            'X-Appwrite-Key': CONFIG.apiKey || '',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API Error: ${response.status}`)
          console.error(`Error details: ${errorText}`)
          console.error(`Request URL: ${url}`)
          
          throw new Error(`Appwrite API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const documents = data.documents || []
        const total = data.total || 0
        
        // Set total on first request
        if (totalDocuments === 0) {
          totalDocuments = total
        }
        
        if (documents.length > 0) {
          allDocuments = [...allDocuments, ...documents]
          offset += documents.length
          
          // Check if we've fetched all documents
          if (documents.length < limit || allDocuments.length >= totalDocuments) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
        
        // Safety check
        if (offset > 10000) {
          hasMore = false
        }
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError)
        throw fetchError
      }
    }
    
    return NextResponse.json({
      documents: allDocuments,
      total: allDocuments.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}


