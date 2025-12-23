import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch all items with pagination
    let allItems: any[] = []
    let page = 1
    const limit = 100
    let hasMore = true
    let totalCount = 0

    while (hasMore) {
      const response = await fetch(
        `https://enteward-directus.cloud3.appetite.studio/items/interested_wards?page=${page}&limit=${limit}&meta=total_count`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Directus API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      // Get total count from meta on first request
      if (totalCount === 0 && data.meta) {
        totalCount = data.meta.total_count || 0
      }

      const items = data.data || []
      allItems = [...allItems, ...items]

      // Check if we've fetched all items
      if (items.length < limit || allItems.length >= totalCount) {
        hasMore = false
      } else {
        page++
      }

      // Safety limit
      if (page > 50) {
        hasMore = false
      }
    }
    
    // Filter out personal details like mobile number, email, name, phone, etc.
    const personalFields = [
      'mobile', 'mobileNumber', 'phone', 'phoneNumber', 'phone_number',
      'email', 'emailAddress', 'contact', 'contactNumber',
      'address', 'fullAddress', 'personalInfo', 'personal_info',
      'name' // Exclude name as it's personal information
    ]
    
    const sanitizedData = {
      data: allItems.map((item: any) => {
        const sanitizedItem: any = {}
        Object.keys(item).forEach(key => {
          const lowerKey = key.toLowerCase()
          // Only exclude if it's a personal field
          const isPersonalField = personalFields.some(field => 
            lowerKey.includes(field.toLowerCase())
          )
          if (!isPersonalField) {
            sanitizedItem[key] = item[key]
          }
        })
        return sanitizedItem
      }),
      meta: {
        total_count: totalCount || allItems.length
      }
    }

    return NextResponse.json(sanitizedData)
  } catch (error: any) {
    console.error('Error fetching interested wards:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch interested wards' },
      { status: 500 }
    )
  }
}
