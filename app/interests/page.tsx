'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'
import { MapPin, AlertCircle, BarChart, Map as MapIcon, Filter, ArrowUpDown, X } from 'lucide-react'

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

interface MonthlyData {
  month: string
  count: number
  monthNumber: number
}

export default function InterestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'councillors' | 'people'>('councillors')
  const [interestedWardAnalytics, setInterestedWardAnalytics] = useState<InterestedWardAnalytics | null>(null)
  const [interestedCouncillors, setInterestedCouncillors] = useState<InterestedCouncillor[]>([])
  const [interestedWards, setInterestedWards] = useState<InterestedWard[]>([])
  const [wardsList, setWardsList] = useState<Ward[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [monthlyInterestData, setMonthlyInterestData] = useState<MonthlyData[]>([])
  
  // Filter and sort states for Councillors
  const [councillorFilters, setCouncillorFilters] = useState({
    district: '',
    panchayath: '',
    type: '',
    search: ''
  })
  const [councillorSortBy, setCouncillorSortBy] = useState<'name' | 'district' | 'ward' | 'date'>('date')
  const [councillorSortOrder, setCouncillorSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Filter and sort states for People
  const [peopleFilters, setPeopleFilters] = useState({
    district: '',
    panchayath: '',
    type: '',
    ward: '',
    search: ''
  })
  const [peopleSortBy, setPeopleSortBy] = useState<'ward' | 'district' | 'date'>('date')
  const [peopleSortOrder, setPeopleSortOrder] = useState<'asc' | 'desc'>('desc')

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

  // Get unique values for filter dropdowns
  const getUniqueDistricts = (data: any[]) => {
    const districts = new Set<string>()
    data.forEach(item => {
      const district = item.district || item.District
      if (district) districts.add(String(district))
    })
    return Array.from(districts).sort()
  }

  const getUniquePanchayaths = (data: any[]) => {
    const panchayaths = new Set<string>()
    data.forEach(item => {
      const panchayath = item.panchayath_name || item.panchayathName
      if (panchayath) panchayaths.add(String(panchayath))
    })
    return Array.from(panchayaths).sort()
  }

  const getUniqueTypes = (data: any[]) => {
    const types = new Set<string>()
    data.forEach(item => {
      const type = item.type || item.panchayath_type
      if (type) types.add(String(type))
    })
    return Array.from(types).sort()
  }

  // Filter and sort councillors
  const getFilteredAndSortedCouncillors = () => {
    let filtered = [...interestedCouncillors]

    // Apply filters
    if (councillorFilters.district) {
      filtered = filtered.filter(c => c.district === councillorFilters.district)
    }
    if (councillorFilters.panchayath) {
      filtered = filtered.filter(c => c.panchayath_name === councillorFilters.panchayath)
    }
    if (councillorFilters.type) {
      filtered = filtered.filter(c => c.panchayath_type === councillorFilters.type)
    }
    if (councillorFilters.search) {
      const searchLower = councillorFilters.search.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.ward_number.toString().includes(searchLower) ||
        c.phone_number.includes(searchLower) ||
        c.district.toLowerCase().includes(searchLower)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (councillorSortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'district':
          aValue = a.district.toLowerCase()
          bValue = b.district.toLowerCase()
          break
        case 'ward':
          aValue = parseInt(a.ward_number) || 0
          bValue = parseInt(b.ward_number) || 0
          break
        case 'date':
          aValue = new Date(a.date_created || a.dateCreated || a.created_at || a.createdAt || 0).getTime()
          bValue = new Date(b.date_created || b.dateCreated || b.created_at || b.createdAt || 0).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return councillorSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return councillorSortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }

  // Filter and sort people
  const getFilteredAndSortedPeople = () => {
    let filtered = [...interestedWards]

    // Apply filters
    if (peopleFilters.district) {
      filtered = filtered.filter(w => (w.district || w.District) === peopleFilters.district)
    }
    if (peopleFilters.panchayath) {
      filtered = filtered.filter(w => (w.panchayath_name || w.panchayathName) === peopleFilters.panchayath)
    }
    if (peopleFilters.type) {
      filtered = filtered.filter(w => w.type === peopleFilters.type)
    }
    if (peopleFilters.ward) {
      const wardNum = String(peopleFilters.ward)
      filtered = filtered.filter(w => 
        String(w.ward_number || w.ward || w.wardId || w.ward_id) === wardNum
      )
    }
    if (peopleFilters.search) {
      const searchLower = peopleFilters.search.toLowerCase()
      filtered = filtered.filter(w => {
        const wardNumber = String(w.ward_number || w.ward || w.wardId || w.ward_id || '')
        const district = String(w.district || w.District || '')
        const panchayath = String(w.panchayath_name || w.panchayathName || '')
        return wardNumber.includes(searchLower) || 
               district.toLowerCase().includes(searchLower) ||
               panchayath.toLowerCase().includes(searchLower)
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (peopleSortBy) {
        case 'ward':
          aValue = parseInt(String(a.ward_number || a.ward || a.wardId || a.ward_id || 0)) || 0
          bValue = parseInt(String(b.ward_number || b.ward || b.wardId || b.ward_id || 0)) || 0
          break
        case 'district':
          aValue = (a.district || a.District || '').toLowerCase()
          bValue = (b.district || b.District || '').toLowerCase()
          break
        case 'date':
          aValue = new Date(a.date_created || a.dateCreated || a.created_at || a.createdAt || a.$createdAt || 0).getTime()
          bValue = new Date(b.date_created || b.dateCreated || b.created_at || b.createdAt || b.$createdAt || 0).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return peopleSortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return peopleSortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
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

      let interestedWardsList: InterestedWard[] = []
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
          interestedWardsList = interestedWardsData.data || []
          
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

      let interestedCouncillorsList: InterestedCouncillor[] = []
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
          interestedCouncillorsList = interestedCouncillorsData.data || []
          setInterestedCouncillors(interestedCouncillorsList)
        }
      } catch (error) {
        console.error('Error fetching interested councillors:', error)
      }

      // Calculate monthly interest data (combining both wards and councillors)
      try {
        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ]
        
        const monthlyCounts: { [key: number]: number } = {}
        months.forEach((_, index) => {
          monthlyCounts[index + 1] = 0
        })

        // Process interested wards
        interestedWardsList.forEach((ward: InterestedWard) => {
          const createdDate = ward.date_created || ward.dateCreated || ward.created_at || ward.createdAt || ward.$createdAt
          if (createdDate) {
            const date = new Date(createdDate)
            if (!isNaN(date.getTime())) {
              const month = date.getMonth() + 1
              monthlyCounts[month] = (monthlyCounts[month] || 0) + 1
            }
          }
        })

        // Process interested councillors
        interestedCouncillorsList.forEach((councillor: InterestedCouncillor) => {
          const createdDate = councillor.date_created || councillor.dateCreated || councillor.created_at || councillor.createdAt
          if (createdDate) {
            const date = new Date(createdDate)
            if (!isNaN(date.getTime())) {
              const month = date.getMonth() + 1
              monthlyCounts[month] = (monthlyCounts[month] || 0) + 1
            }
          }
        })

        const monthlyData: MonthlyData[] = months.map((monthName, index) => ({
          month: monthName,
          count: monthlyCounts[index + 1] || 0,
          monthNumber: index + 1
        }))

        setMonthlyInterestData(monthlyData)
      } catch (error) {
        console.error('Error calculating monthly interest data:', error)
        setMonthlyInterestData([])
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

      {/* Monthly Interest Growth Chart */}
      {monthlyInterestData.length > 0 && (
        <div className="chart-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Interest Growth</h2>
              <p className="text-sm text-gray-600 mt-1">Monthly interest trends</p>
            </div>
            <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              {formatNumber(monthlyInterestData.reduce((sum, d) => sum + d.count, 0))} Total Interests
            </div>
          </div>
          <div className="h-80 w-full overflow-x-auto">
            <svg 
              className="w-full h-full min-w-full" 
              viewBox={`0 0 ${Math.max(monthlyInterestData.length * 80, 800)} 320`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="interestLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              {Array.from({ length: 5 }).map((_, i) => {
                const y = 20 + (i * 280 / 4)
                return (
                  <line
                    key={`grid-${i}`}
                    x1="40"
                    y1={y}
                    x2={Math.max(monthlyInterestData.length * 80, 800) - 40}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                )
              })}
              
              {/* Calculate points for the line */}
              {(() => {
                const maxCount = Math.max(...monthlyInterestData.map(d => d.count), 1)
                const chartWidth = Math.max(monthlyInterestData.length * 80, 800) - 80
                const chartHeight = 280
                
                const points = monthlyInterestData.map((data, index) => {
                  const x = 40 + (index / Math.max(monthlyInterestData.length - 1, 1)) * chartWidth
                  const y = 300 - (data.count / maxCount) * chartHeight
                  return { x, y, data }
                })
                
                // Create path string for the line
                const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                
                // Create area path (for gradient fill)
                const areaPath = `${pathData} L ${points[points.length - 1].x} 300 L ${points[0].x} 300 Z`
                
                return (
                  <>
                    {/* Area under line */}
                    <path
                      d={areaPath}
                      fill="url(#interestLineGradient)"
                    />
                    
                    {/* Line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Points */}
                    {points.map((point, index) => (
                      <g key={index}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="5"
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="hover:r-7 transition-all cursor-pointer"
                        />
                        {/* Tooltip value on hover */}
                        <text
                          x={point.x}
                          y={point.y - 10}
                          textAnchor="middle"
                          fontSize="12"
                          fill="#374151"
                          fontWeight="600"
                          className="pointer-events-none"
                        >
                          {point.data.count}
                        </text>
                      </g>
                    ))}
                    
                    {/* X-axis labels */}
                    {points.map((point, index) => (
                      <g key={`label-${index}`}>
                        <text
                          x={point.x}
                          y={315}
                          textAnchor="middle"
                          fontSize="12"
                          fill="#6b7280"
                          fontWeight="500"
                        >
                          {point.data.month}
                        </text>
                      </g>
                    ))}
                  </>
                )
              })()}
            </svg>
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

      {/* Tab Bar */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('councillors')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'councillors'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Councillors
      {interestedCouncillors.length > 0 && (
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                activeTab === 'councillors' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {formatNumber(interestedCouncillors.length)}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'people'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            People
            {interestedWards.length > 0 && (
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                activeTab === 'people' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {formatNumber(interestedWards.length)}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'councillors' && (
        <div>
            {interestedCouncillors.length > 0 ? (
              <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Interested Councillors</h2>
              <p className="text-sm text-gray-600 mt-1">Councillors who have shown interest in the platform</p>
            </div>
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    {formatNumber(getFilteredAndSortedCouncillors().length)} Councillors
                  </div>
                </div>

                {/* Filters and Sort */}
                <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                      <input
                        type="text"
                        value={councillorFilters.search}
                        onChange={(e) => setCouncillorFilters({...councillorFilters, search: e.target.value})}
                        placeholder="Search by name, ward, phone..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    {/* District Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                      <select
                        value={councillorFilters.district}
                        onChange={(e) => setCouncillorFilters({...councillorFilters, district: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">All Districts</option>
                        {getUniqueDistricts(interestedCouncillors).map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>
                    {/* Panchayath Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Panchayath</label>
                      <select
                        value={councillorFilters.panchayath}
                        onChange={(e) => setCouncillorFilters({...councillorFilters, panchayath: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">All Panchayaths</option>
                        {getUniquePanchayaths(interestedCouncillors).map(panchayath => (
                          <option key={panchayath} value={panchayath}>{panchayath}</option>
                        ))}
                      </select>
                    </div>
                    {/* Type Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={councillorFilters.type}
                        onChange={(e) => setCouncillorFilters({...councillorFilters, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">All Types</option>
                        {getUniqueTypes(interestedCouncillors).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Sort by:</span>
                      <select
                        value={councillorSortBy}
                        onChange={(e) => setCouncillorSortBy(e.target.value as 'name' | 'district' | 'ward' | 'date')}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="name">Name</option>
                        <option value="district">District</option>
                        <option value="ward">Ward</option>
                        <option value="date">Date</option>
                      </select>
                      <button
                        onClick={() => setCouncillorSortOrder(councillorSortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-1"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        {councillorSortOrder === 'asc' ? 'Asc' : 'Desc'}
                      </button>
                    </div>
                    {(councillorFilters.district || councillorFilters.panchayath || councillorFilters.type || councillorFilters.search) && (
                      <button
                        onClick={() => setCouncillorFilters({district: '', panchayath: '', type: '', search: ''})}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Clear Filters
                      </button>
                    )}
            </div>
          </div>

          <div className="space-y-4">
                  {getFilteredAndSortedCouncillors().map((councillor) => {
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
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No interested councillors found.</p>
              </div>
            )}
        </div>
      )}

        {activeTab === 'people' && (
        <div>
            {interestedWards.length > 0 ? (
              <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">People's Interests</h2>
              <p className="text-sm text-gray-600 mt-1">People who have shown interest in different wards</p>
            </div>
            <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                    {formatNumber(getFilteredAndSortedPeople().length)} People
                  </div>
                </div>

                {/* Filters and Sort */}
                <div className="bg-white rounded-xl p-4 shadow-soft border border-gray-100 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                      <input
                        type="text"
                        value={peopleFilters.search}
                        onChange={(e) => setPeopleFilters({...peopleFilters, search: e.target.value})}
                        placeholder="Search by ward, district, panchayath..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    {/* District Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">District</label>
                      <select
                        value={peopleFilters.district}
                        onChange={(e) => setPeopleFilters({...peopleFilters, district: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">All Districts</option>
                        {getUniqueDistricts(interestedWards).map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>
                    {/* Panchayath Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Panchayath</label>
                      <select
                        value={peopleFilters.panchayath}
                        onChange={(e) => setPeopleFilters({...peopleFilters, panchayath: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">All Panchayaths</option>
                        {getUniquePanchayaths(interestedWards).map(panchayath => (
                          <option key={panchayath} value={panchayath}>{panchayath}</option>
                        ))}
                      </select>
                    </div>
                    {/* Type Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={peopleFilters.type}
                        onChange={(e) => setPeopleFilters({...peopleFilters, type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">All Types</option>
                        {getUniqueTypes(interestedWards).map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Ward Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ward Number</label>
                      <input
                        type="text"
                        value={peopleFilters.ward}
                        onChange={(e) => setPeopleFilters({...peopleFilters, ward: e.target.value})}
                        placeholder="Filter by ward number..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Sort by:</span>
                      <select
                        value={peopleSortBy}
                        onChange={(e) => setPeopleSortBy(e.target.value as 'ward' | 'district' | 'date')}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="ward">Ward</option>
                        <option value="district">District</option>
                        <option value="date">Date</option>
                      </select>
                      <button
                        onClick={() => setPeopleSortOrder(peopleSortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center gap-1"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        {peopleSortOrder === 'asc' ? 'Asc' : 'Desc'}
                      </button>
                    </div>
                    {(peopleFilters.district || peopleFilters.panchayath || peopleFilters.type || peopleFilters.ward || peopleFilters.search) && (
                      <button
                        onClick={() => setPeopleFilters({district: '', panchayath: '', type: '', ward: '', search: ''})}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <X className="w-4 h-4" />
                        Clear Filters
                      </button>
                    )}
            </div>
          </div>

          <div className="space-y-4">
                  {getFilteredAndSortedPeople().map((ward, index) => {
              const createdDate = formatDate(ward.date_created || ward.dateCreated || ward.created_at || ward.createdAt || ward.$createdAt)
              const wardNumber = ward.ward_number || ward.ward || ward.wardId || ward.ward_id || 'N/A'
              const district = ward.District || ward.district || 'Unknown'
              const panchayathName = ward.panchayath_name || ward.panchayathName || 'N/A'
              const type = ward.type || 'N/A'
              
              // Find matching ward details
              const matchingWard = wardsList.find(w => String(w.ward_number) === String(wardNumber))
              
                    // Get all available fields (excluding internal/technical fields and already displayed fields)
                    const excludedFields = [
                      'id', '$id', 
                      'date_created', 'dateCreated', 'created_at', 'createdAt', '$createdAt', 
                      'date_updated', 'dateUpdated', 'updated_at', 'updatedAt', '$updatedAt',
                      'ward_number', 'ward', 'wardId', 'ward_id', 'wardNumber',
                      'District', 'district', 'panchayath_name', 'panchayathName', 'type'
                    ]
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No people interests found.</p>
              </div>
            )}
        </div>
      )}
      </div>
    </div>
  )
}
