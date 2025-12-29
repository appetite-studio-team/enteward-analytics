import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://enteward-directus.cloud3.appetite.studio/items/wards', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Directus API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching wards:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wards' },
      { status: 500 }
    )
  }
}






