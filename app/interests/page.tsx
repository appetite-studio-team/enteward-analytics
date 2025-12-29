'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'
import { MapPin, AlertCircle, BarChart, Map as MapIcon } from 'lucide-react'

interface InterestedWard {
  id?: string
  ward_number?: string | number
  ward?: number | string
  wardId?: number | string
  ward_id?: number | string
  District?: string
  district?: string
  panchayath_name?: string
  panchayathName?: string
  type?: string
  [key: string]: any
}

interface InterestedWardAnalytics {
  totalCount: number
  countByWard: { [wardId: string]: number }
  countByDistrict: { [district: string]: number }
  districtCount: number
  topWards: { 
    wardId: string
    count: number
    wardName?: string
    district?: string
    panchayathName?: string
    type?: string
    councillorName?: string
    municipalityName?: string
  }[]
}

interface Ward {
  id: string
  ward_name: string
  ward_number: string
  ward_councillor: number
  muncipality: number
  contractAddress: string | null
  councillorName?: string
  municipalityName?: string
}

interface InterestedCouncillor {
  id: number
  district: string
  panchayath_name: string
  ward_number: string
  panchayath_type: string
  name: string
  phone_number: string
  date_created?: string
  date_updated?: string
  [key: string]: any
}

export default function InterestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interestedWardAnalytics, setInterestedWardAnalytics] = useState<InterestedWardAnalytics | null>(null)
  const [interestedCouncillors, setInterestedCouncillors] = useState<InterestedCouncillor[]>([])
  const [interestedWards, setInterestedWards] = useState<InterestedWard[]>([])
  const [wardsList, setWardsList] = useState<Ward[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return {
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }
    } catch {
      return null
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      let wardsList: Ward[] = []
      let councillorsMap: Map<number, string> = new Map()
      let municipalitiesMap: Map<number, string> = new Map()

      try {
        const [wardsResponse, councillorsResponse, municipalitiesResponse] = await Promise.all([
          fetch('/api/wards'),
          fetch('/api/councillors'),
          fetch('/api/municipalities')
        ])

        if (wardsResponse.ok) {
          const wardsData = await wardsResponse.json()
          wardsList = wardsData.data || []
        }

        if (councillorsResponse.ok) {
          const councillorsData = await councillorsResponse.json()
          const councillors = councillorsData.data || []
          councillors.forEach((councillor: any) => {
            const id = councillor.id
            const name = councillor.councilorName || councillor.councillorName || councillor.name || 'Unknown'
            if (id) councillorsMap.set(id, name)
          })
        }

        if (municipalitiesResponse.ok) {
          const municipalitiesData = await municipalitiesResponse.json()
          const municipalities = municipalitiesData.data || []
          municipalities.forEach((municipality: any) => {
            const id = municipality.id
            const name = municipality.name || 'Unknown'
            if (id) municipalitiesMap.set(id, name)
          })
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }

      const mappedWardsList = wardsList.map(ward => ({
        ...ward,
        councillorName: councillorsMap.get(ward.ward_councillor) || `Councillor #${ward.ward_councillor}`,
        municipalityName: municipalitiesMap.get(ward.muncipality) || `Municipality #${ward.muncipality}`
      }))
      setWardsList(mappedWardsList)

      try {
        const timestamp = new Date().getTime()
        const interestedWardsResponse = await fetch(`/api/interested-wards?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        if (interestedWardsResponse.ok) {
          const interestedWardsData = await interestedWardsResponse.json()
          const interestedWardsList: InterestedWard[] = interestedWardsData.data || []
          
          // Store the full list of interested wards
          setInterestedWards(interestedWardsList)
          
          const countByWard: { [wardNumber: string]: number } = {}
          const countByDistrict: { [district: string]: number } = {}
          const wardDetailsMap: { [wardNumber: string]: { district?: string; panchayathName?: string; type?: string } } = {}
          
          interestedWardsList.forEach((item: InterestedWard) => {
            const wardNumber = String(item.ward_number || item.ward || item.wardId || item.ward_id || 'unknown')
            countByWard[wardNumber] = (countByWard[wardNumber] || 0) + 1
            
            const district = String(item.District || item.district || 'Unknown')
            countByDistrict[district] = (countByDistrict[district] || 0) + 1
            
            if (!wardDetailsMap[wardNumber]) {
              wardDetailsMap[wardNumber] = {
                district: district !== 'Unknown' ? district : undefined,
                panchayathName: item.panchayath_name || item.panchayathName || undefined,
                type: item.type || undefined
              }
            }
          })
          
          const topWards = Object.entries(countByWard)
            .map(([wardNumber, count]) => {
              const ward = mappedWardsList.find(w => String(w.ward_number) === wardNumber)
              const wardDetails = wardDetailsMap[wardNumber] || {}
              return {
                wardId: wardNumber,
                count,
                wardName: ward ? `${ward.ward_name.trim()} (Ward #${ward.ward_number})` : `Ward #${wardNumber}`,
                district: wardDetails.district,
                panchayathName: wardDetails.panchayathName,
                type: wardDetails.type,
                councillorName: ward?.councillorName,
                municipalityName: ward?.municipalityName
              }
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
          
          const totalCount = interestedWardsData.meta?.total_count || interestedWardsList.length
          
          setInterestedWardAnalytics({
            totalCount,
            countByWard,
            countByDistrict,
            districtCount: Object.keys(countByDistrict).length,
            topWards
          })
        }
      } catch (error) {
        console.error('Error fetching interested wards:', error)
        setError('Failed to fetch interested wards data')
      }

      try {
        const timestamp = new Date().getTime()
        const interestedCouncillorsResponse = await fetch(`/api/interested-councillors?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        if (interestedCouncillorsResponse.ok) {
          const interestedCouncillorsData = await interestedCouncillorsResponse.json()
          setInterestedCouncillors(interestedCouncillorsData.data || [])
        }
      } catch (error) {
        console.error('Error fetching interested councillors:', error)
      }

      setLastUpdated(new Date())
      setLoading(false)
    } catch (error: any) {
      console.error('Error loading data:', error)
      setError(`Failed to load data: ${error.message}`)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Interested Wards Analytics</h1>
          <p className="text-gray-600 mt-1">Community interest in different wards</p>
        </div>
        {lastUpdated && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Last updated</p>
            <p className="text-sm font-medium text-gray-700">{lastUpdated.toLocaleTimeString()}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {interestedWardAnalytics && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Interested Wards Analytics</h2>
              <p className="text-sm text-gray-600 mt-1">Community interest in different wards</p>
            </div>
            <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              {formatNumber(interestedWardAnalytics.totalCount)} Total Interests
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="metric-card border-t-4 border-t-primary-500">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart className="w-6 h-6 text-primary-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Interests</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(interestedWardAnalytics.totalCount)}</p>
              <p className="text-xs text-gray-500 mt-2">Total ward interests registered</p>
            </div>
            <div className="metric-card border-t-4 border-t-green-500">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MapIcon className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Districts</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(interestedWardAnalytics.districtCount)}</p>
              <p className="text-xs text-gray-500 mt-2">Districts with registered interests</p>
            </div>
          </div>

          {Object.keys(interestedWardAnalytics.countByDistrict).length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">District Wise Count</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(interestedWardAnalytics.countByDistrict)
                  .sort(([, a], [, b]) => b - a)
                  .map(([district, count]) => (
                    <div key={district} className="bg-white rounded-xl p-4 shadow-soft border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{district}</p>
                          <p className="text-2xl font-bold text-primary-600">{formatNumber(count)}</p>
                          <p className="text-xs text-gray-500">Interests</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {interestedCouncillors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Interested Councillors</h2>
              <p className="text-sm text-gray-600 mt-1">Councillors who have shown interest in the platform</p>
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              {formatNumber(interestedCouncillors.length)} Councillors
            </div>
          </div>
          <div className="space-y-4">
            {interestedCouncillors.map((councillor) => {
              const createdDate = formatDate(councillor.date_created || councillor.dateCreated || councillor.created_at || councillor.createdAt)
              return (
                <div key={councillor.id} className="bg-white rounded-xl p-6 shadow-soft border border-gray-100 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">{councillor.name}</h3>
                    {createdDate && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{createdDate.date}</p>
                        <p className="text-xs text-gray-500">{createdDate.time}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Ward</p>
                      <p className="text-sm font-semibold text-gray-900">#{councillor.ward_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">District</p>
                      <p className="text-sm font-semibold text-gray-900">{councillor.district}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Panchayath</p>
                      <p className="text-sm font-semibold text-gray-900">{councillor.panchayath_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Type</p>
                      <p className="text-sm font-semibold text-gray-900">{councillor.panchayath_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Phone</p>
                      <a 
                        href={`tel:${councillor.phone_number}`}
                        className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                      >
                        {councillor.phone_number}
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {interestedWards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">People's Interests</h2>
              <p className="text-sm text-gray-600 mt-1">People who have shown interest in different wards</p>
            </div>
            <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              {formatNumber(interestedWards.length)} People
            </div>
          </div>
          <div className="space-y-4">
            {interestedWards.map((ward, index) => {
              const createdDate = formatDate(ward.date_created || ward.dateCreated || ward.created_at || ward.createdAt || ward.$createdAt)
              const wardNumber = ward.ward_number || ward.ward || ward.wardId || ward.ward_id || 'N/A'
              const district = ward.District || ward.district || 'Unknown'
              const panchayathName = ward.panchayath_name || ward.panchayathName || 'N/A'
              const type = ward.type || 'N/A'
              
              // Find matching ward details
              const matchingWard = wardsList.find(w => String(w.ward_number) === String(wardNumber))
              
              // Get all available fields (excluding internal/technical fields)
              const excludedFields = ['id', '$id', 'date_created', 'dateCreated', 'created_at', 'createdAt', '$createdAt', 'date_updated', 'dateUpdated', 'updated_at', 'updatedAt', '$updatedAt']
              const availableFields = Object.keys(ward).filter(key => 
                !excludedFields.includes(key) && 
                !key.startsWith('$') &&
                ward[key] !== null && 
                ward[key] !== undefined && 
                ward[key] !== ''
              )
              
              return (
                <div key={ward.id || ward.$id || index} className="bg-white rounded-xl p-6 shadow-soft border border-gray-100 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {matchingWard ? matchingWard.ward_name.trim() : `Ward #${wardNumber}`}
                      </h3>
                      {matchingWard && (
                        <p className="text-sm text-primary-600 font-semibold mt-1">Ward #{wardNumber}</p>
                      )}
                    </div>
                    {createdDate && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{createdDate.date}</p>
                        <p className="text-xs text-gray-500">{createdDate.time}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Standard Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Ward Number</p>
                      <p className="text-sm font-semibold text-gray-900">#{wardNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">District</p>
                      <p className="text-sm font-semibold text-gray-900">{district}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Panchayath</p>
                      <p className="text-sm font-semibold text-gray-900">{panchayathName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium mb-1">Type</p>
                      <p className="text-sm font-semibold text-gray-900">{type}</p>
                    </div>
                  </div>

                  {/* Matching Ward Details */}
                  {matchingWard && (
                    <div className="mb-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-3 uppercase tracking-wide">Ward Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 font-medium mb-1">Councillor</p>
                          <p className="text-sm font-semibold text-gray-900">{matchingWard.councillorName}</p>
                        </div>
                        {matchingWard.municipalityName && (
                          <div>
                            <p className="text-xs text-gray-600 font-medium mb-1">Municipality</p>
                            <p className="text-sm font-semibold text-gray-900">{matchingWard.municipalityName}</p>
                          </div>
                        )}
                        {matchingWard.contractAddress && (
                          <div>
                            <p className="text-xs text-gray-600 font-medium mb-1">Contract Address</p>
                            <p className="text-sm font-semibold text-gray-900 break-all">{matchingWard.contractAddress}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* All Other Available Fields */}
                  {availableFields.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-3 uppercase tracking-wide">Additional Information</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableFields.map((field) => {
                          const value = ward[field]
                          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
                          const fieldLabel = field
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim()
                          
                          return (
                            <div key={field}>
                              <p className="text-xs text-gray-600 font-medium mb-1">{fieldLabel}</p>
                              <p className="text-sm font-semibold text-gray-900 break-words">
                                {displayValue.length > 100 ? `${displayValue.substring(0, 100)}...` : displayValue}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
