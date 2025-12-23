import { NextResponse } from 'next/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const response = await fetch('https://enteward-directus.cloud3.appetite.studio/items/interested_councilors', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Prevent caching
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Directus API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // Return response with no-cache headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('Error fetching interested councillors:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch interested councillors' },
      { status: 500 }
    )
  }
}

