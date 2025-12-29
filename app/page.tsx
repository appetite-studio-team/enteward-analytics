'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'
import { Users, Droplet, Handshake, Heart, AlertCircle, DollarSign, FileText } from 'lucide-react'

interface Collection {
  $id: string
  name: string
  $createdAt: string
  documentCount: number | string
}

interface Stats {
  totalUsers: number
  totalBloodDonors: number
  totalVolunteers: number
  totalDonations: number
  totalIssueReports: number
}

interface MonthlyData {
  month: string
  count: number
  monthNumber: number
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
  analytics?: {
    users: number
    donors: number
    volunteers: number
    donations: number
    issueReports: number
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [wards, setWards] = useState<Ward[]>([])
  const [monthlyUserData, setMonthlyUserData] = useState<MonthlyData[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const collectionsResponse = await fetch('/api/collections')
      
      if (!collectionsResponse.ok) {
        const errorData = await collectionsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch collections')
      }
      
      const collectionsData = await collectionsResponse.json()
      
      if (!collectionsData.collections || collectionsData.collections.length === 0) {
        setError('No collections found in the database.')
        setLoading(false)
        return
      }

      const collectionData = await Promise.all(
        collectionsData.collections.map(async (collection: any) => {
          try {
            const documentsResponse = await fetch(
              `/api/documents?collectionId=${collection.$id}`
            )
            
            if (!documentsResponse.ok) {
              throw new Error('Failed to fetch documents')
            }
            
            const documentsData = await documentsResponse.json()
            return {
              ...collection,
              documentCount: documentsData.total || 0
            }
          } catch (error) {
            console.error(`Error fetching documents for ${collection.name}:`, error)
            return {
              ...collection,
              documentCount: 0
            }
          }
        })
      )

      const getCollectionCount = (name: string): number => {
        const collection = collectionData.find(
          col => col.name.toLowerCase() === name.toLowerCase()
        )
        if (!collection) return 0
        return typeof collection.documentCount === 'number' ? collection.documentCount : 0
      }

      const findCollectionByName = (names: string[]): number => {
        for (const name of names) {
          const count = getCollectionCount(name)
          if (count > 0) return count
        }
        const collection = collectionData.find(col => 
          names.some(name => col.name.toLowerCase().includes(name.toLowerCase()))
        )
        return collection && typeof collection.documentCount === 'number' 
          ? collection.documentCount 
          : 0
      }

      const totalUsers = findCollectionByName(['user', 'users', 'member', 'members'])
      const totalBloodDonors = findCollectionByName(['blood donor', 'blooddonor', 'donor', 'donors', 'blood-donor'])
      const totalVolunteers = findCollectionByName(['volunteer', 'volunteers'])
      const totalDonations = findCollectionByName(['donation', 'donations'])
      const totalIssueReports = findCollectionByName(['issue report', 'issuereport', 'issue', 'issues', 'issue-report', 'report', 'reports'])

      setStats({
        totalUsers,
        totalBloodDonors,
        totalVolunteers,
        totalDonations,
        totalIssueReports
      })

      const usersCollection = collectionData.find(col => 
        ['user', 'users', 'member', 'members'].some(name => 
          col.name.toLowerCase().includes(name.toLowerCase())
        )
      )

      if (usersCollection?.$id) {
        try {
          const usersDocsResponse = await fetch(`/api/documents-by-ward?collectionId=${usersCollection.$id}`)
          if (usersDocsResponse.ok) {
            const usersDocsData = await usersDocsResponse.json()
            const usersDocs = usersDocsData.documents || []
            
            const months = [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ]
            
            const monthlyCounts: { [key: number]: number } = {}
            months.forEach((_, index) => {
              monthlyCounts[index + 1] = 0
            })

            usersDocs.forEach((user: any) => {
              const joinedDate = user.joinedDate || user.joined_date || user.$createdAt || user.createdAt || user.created_at
              if (joinedDate) {
                const date = new Date(joinedDate)
                if (!isNaN(date.getTime())) {
                  const userMonth = date.getMonth() + 1
                  monthlyCounts[userMonth] = (monthlyCounts[userMonth] || 0) + 1
                }
              }
            })

            const monthlyData: MonthlyData[] = months.map((monthName, index) => ({
              month: monthName,
              count: monthlyCounts[index + 1] || 0,
              monthNumber: index + 1
            }))

            setMonthlyUserData(monthlyData)
          }
        } catch (error) {
          console.error('Error fetching user data for chart:', error)
          setMonthlyUserData([])
        }
      } else {
        setMonthlyUserData([])
      }

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

      wardsList = wardsList.map(ward => ({
        ...ward,
        councillorName: councillorsMap.get(ward.ward_councillor) || `Councillor #${ward.ward_councillor}`,
        municipalityName: municipalitiesMap.get(ward.muncipality) || `Municipality #${ward.muncipality}`
      }))

      if (wardsList.length > 0) {
        const usersCollection = collectionData.find(col => 
          ['user', 'users', 'member', 'members'].some(name => 
            col.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        const donorsCollection = collectionData.find(col => 
          ['blood donor', 'blooddonor', 'donor', 'donors', 'blood-donor'].some(name => 
            col.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        const volunteersCollection = collectionData.find(col => 
          ['volunteer', 'volunteers'].some(name => 
            col.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        const donationsCollection = collectionData.find(col => 
          ['donation', 'donations'].some(name => 
            col.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        const issueReportsCollection = collectionData.find(col => 
          ['issue report', 'issuereport', 'issue', 'issues', 'issue-report', 'report', 'reports'].some(name => 
            col.name.toLowerCase().includes(name.toLowerCase())
          )
        )

        const fetchDocuments = async (collectionId: string | undefined) => {
          if (!collectionId) return []
          try {
            const response = await fetch(`/api/documents-by-ward?collectionId=${collectionId}`)
            if (response.ok) {
              const data = await response.json()
              return data.documents || []
            }
          } catch (error) {
            console.error('Error fetching documents:', error)
          }
          return []
        }

        const [usersDocs, donorsDocs, volunteersDocs, donationsDocs, issueReportsDocs] = await Promise.all([
          fetchDocuments(usersCollection?.$id),
          fetchDocuments(donorsCollection?.$id),
          fetchDocuments(volunteersCollection?.$id),
          fetchDocuments(donationsCollection?.$id),
          fetchDocuments(issueReportsCollection?.$id)
        ])

        const getWardId = (doc: any): string | null => {
          return doc.wardId || doc.ward_id || doc.ward || doc.wardid || null
        }

        const wardsWithAnalytics = wardsList.map(ward => {
          const wardId = ward.id
          
          const users = usersDocs.filter((doc: any) => getWardId(doc) === wardId).length
          const donors = donorsDocs.filter((doc: any) => getWardId(doc) === wardId).length
          const volunteers = volunteersDocs.filter((doc: any) => getWardId(doc) === wardId).length
          const donations = donationsDocs.filter((doc: any) => getWardId(doc) === wardId).length
          const issueReports = issueReportsDocs.filter((doc: any) => getWardId(doc) === wardId).length

          return {
            ...ward,
            analytics: {
              users,
              donors,
              volunteers,
              donations,
              issueReports
            }
          }
        })

        setWards(wardsWithAnalytics)
      } else {
        setWards([])
      }

      setLastUpdated(new Date())
      setLoading(false)
    } catch (error: any) {
      console.error('Error loading data:', error)
      setError(`Failed to load data: ${error.message}. Please check your Appwrite configuration and ensure the endpoint is accessible.`)
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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to your analytics dashboard</p>
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

      {/* Key Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <div className="metric-card border-t-4 border-t-primary-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalUsers)}</p>
            <p className="text-xs text-gray-500 mt-2">Registered members</p>
          </div>

          <div className="metric-card border-t-4 border-t-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Droplet className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Blood Donors</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalBloodDonors)}</p>
            <p className="text-xs text-gray-500 mt-2">Active donors</p>
          </div>

          <div className="metric-card border-t-4 border-t-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Handshake className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Volunteers</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalVolunteers)}</p>
            <p className="text-xs text-gray-500 mt-2">Active volunteers</p>
          </div>

          <div className="metric-card border-t-4 border-t-yellow-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Donations</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalDonations)}</p>
            <p className="text-xs text-gray-500 mt-2">Total donations</p>
          </div>

          <div className="metric-card border-t-4 border-t-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Issue Reports</p>
            <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalIssueReports)}</p>
            <p className="text-xs text-gray-500 mt-2">Reported issues</p>
          </div>
        </div>
      )}

      {/* Monthly User Registration Chart */}
      {monthlyUserData.length > 0 && (
        <div className="chart-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">User Registrations</h2>
              <p className="text-sm text-gray-600 mt-1">Monthly registration trends</p>
            </div>
            <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              {formatNumber(stats?.totalUsers || 0)} Total Users
            </div>
          </div>
          <div className="h-80 w-full overflow-x-auto">
            <svg 
              className="w-full h-full min-w-full" 
              viewBox={`0 0 ${Math.max(monthlyUserData.length * 80, 800)} 320`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
                    x2={Math.max(monthlyUserData.length * 80, 800) - 40}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                )
              })}
              
              {/* Calculate points for the line */}
              {(() => {
                const maxCount = Math.max(...monthlyUserData.map(d => d.count), 1)
                const chartWidth = Math.max(monthlyUserData.length * 80, 800) - 80
                const chartHeight = 280
                
                const points = monthlyUserData.map((data, index) => {
                  const x = 40 + (index / Math.max(monthlyUserData.length - 1, 1)) * chartWidth
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
                      fill="url(#lineGradient)"
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

      {/* Wards Section */}
      {wards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ward Analytics</h2>
              <p className="text-sm text-gray-600 mt-1">Detailed statistics by ward</p>
            </div>
            <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
              {formatNumber(wards.length)} Wards
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wards.map((ward) => (
              <div key={ward.id} className="bg-white rounded-xl p-6 shadow-soft border border-gray-100 hover:shadow-lg transition-all">
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{ward.ward_name.trim()}</h3>
                  <p className="text-sm text-primary-600 font-semibold">Ward #{ward.ward_number}</p>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-600 font-medium">Councillor</span>
                    <span className="text-sm text-gray-900 font-semibold">{ward.councillorName}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-600 font-medium">Municipality</span>
                    <span className="text-sm text-gray-900 font-semibold">{ward.municipalityName}</span>
                  </div>
                </div>

                {ward.analytics && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Statistics</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(ward.analytics.users)}</p>
                          <p className="text-xs text-gray-600">Users</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                          <Droplet className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(ward.analytics.donors)}</p>
                          <p className="text-xs text-gray-600">Donors</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                          <Handshake className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(ward.analytics.volunteers)}</p>
                          <p className="text-xs text-gray-600">Volunteers</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                          <Heart className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">{formatNumber(ward.analytics.donations)}</p>
                          <p className="text-xs text-gray-600">Donations</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
