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
    // Extract collection ID (remove 'collection-' prefix if present)
    const cleanCollectionId = collectionId.replace(/^collection-/, '')

    // Fetch all documents using offset-based pagination
    // Appwrite REST API requires queries as escaped JSON strings
    // Format: queries[]={"method":"limit","values":[100]}
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
      // Queries must be escaped JSON strings
      const urlObj = new URL(`${CONFIG.endpoint}/databases/${databaseId}/collections/${cleanCollectionId}/documents`)
      
      // Create query objects as JSON strings
      const limitQuery = JSON.stringify({ method: 'limit', values: [limit] })
      urlObj.searchParams.append('queries[]', limitQuery)
      
      if (offset > 0) {
        const offsetQuery = JSON.stringify({ method: 'offset', values: [offset] })
        urlObj.searchParams.append('queries[]', offsetQuery)
      }
      
      const url = urlObj.toString()
      
      console.log(`Fetching attempt ${attempts}: offset=${offset}, limit=${limit}`)
      console.log(`URL: ${url}`)
      
      try {
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
          console.log(`Total documents available: ${totalDocuments}`)
        }
        
        if (documents.length > 0) {
          allDocuments = [...allDocuments, ...documents]
          offset += documents.length
          console.log(`Fetched ${documents.length} documents. Total so far: ${allDocuments.length}/${totalDocuments}`)
          
          // Check if we've fetched all documents
          if (documents.length < limit || allDocuments.length >= totalDocuments) {
            hasMore = false
          }
        } else {
          hasMore = false
        }
        
        // Safety check
        if (offset > 10000) {
          console.warn('Reached safety limit')
          hasMore = false
        }
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError)
        throw fetchError
      }
    }
    
    console.log(`Final result: Fetched ${allDocuments.length} documents out of ${totalDocuments} total`)
    
    return NextResponse.json({
      documents: allDocuments,
      total: allDocuments.length
    })
  } catch (error: any) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}
