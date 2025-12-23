'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CONFIG, getAccount } from '@/lib/appwrite'

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
  const [loggingOut, setLoggingOut] = useState(false)

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      const account = getAccount()
      await account.deleteSession('current')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      setLoggingOut(false)
    }
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

      // Map collection names to metrics (case-insensitive matching)
      const getCollectionCount = (name: string): number => {
        const collection = collectionData.find(
          col => col.name.toLowerCase() === name.toLowerCase()
        )
        if (!collection) return 0
        return typeof collection.documentCount === 'number' ? collection.documentCount : 0
      }

      // Find collections by common name variations
      const findCollectionByName = (names: string[]): number => {
        for (const name of names) {
          const count = getCollectionCount(name)
          if (count > 0) return count
        }
        // Try partial matching
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

      // Fetch user documents for monthly chart
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
            
            // Initialize months
            const months = [
              'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ]
            
            const monthlyCounts: { [key: number]: number } = {}
            months.forEach((_, index) => {
              monthlyCounts[index + 1] = 0
            })

            let usersWithValidDate = 0
            let usersWithoutDate = 0

            // Group ALL users by joinedDate (across all years)
            usersDocs.forEach((user: any) => {
              const joinedDate = user.joinedDate || user.joined_date || user.$createdAt || user.createdAt || user.created_at
              if (joinedDate) {
                const date = new Date(joinedDate)
                if (!isNaN(date.getTime())) {
                  const userMonth = date.getMonth() + 1
                  monthlyCounts[userMonth] = (monthlyCounts[userMonth] || 0) + 1
                  usersWithValidDate++
                } else {
                  usersWithoutDate++
                }
              } else {
                usersWithoutDate++
              }
            })

            // Convert to array format
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

      // Fetch wards, councillors, and municipalities from Directus API
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

      // Map names to wards
      wardsList = wardsList.map(ward => ({
        ...ward,
        councillorName: councillorsMap.get(ward.ward_councillor) || `Councillor #${ward.ward_councillor}`,
        municipalityName: municipalitiesMap.get(ward.muncipality) || `Municipality #${ward.muncipality}`
      }))

      // Fetch documents for each collection and group by ward
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

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-title-section">
            <div className="dashboard-logo-title">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="dashboard-logo"
                priority
              />
              <div>
                <h1 className="dashboard-title">Enteward Analytics</h1>
                <p className="dashboard-subtitle">Dashboard for community insights</p>
              </div>
            </div>
          </div>
          <div className="dashboard-header-actions">
            {lastUpdated && (
              <div className="last-updated">
                <span className="last-updated-label">Last updated</span>
                <span className="last-updated-time">{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            <Link href="/interests" className="btn-nav">
              Interests
            </Link>
            <button className="btn-refresh" onClick={loadData} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2V6M8 10V14M2 8H6M10 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M2.5 2.5L5.5 5.5M10.5 10.5L13.5 13.5M2.5 13.5L5.5 10.5M10.5 5.5L13.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Refresh
            </button>
            <button className="btn-logout" onClick={handleLogout} disabled={loggingOut}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6M10 11L14 7M14 7L10 3M14 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {error && (
          <div className="alert alert-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div>
              <strong>Error</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading analytics data...</p>
          </div>
        ) : (
          <>
            {/* Monthly User Registration Chart */}
            {monthlyUserData.length > 0 && (
              <section className="chart-section">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">User Registrations</h2>
                    <p className="section-description">Monthly registration trends across all time</p>
                  </div>
                  <div className="section-badge">
                    {formatNumber(stats?.totalUsers || 0)} Total Users
                  </div>
                </div>
                <div className="chart-wrapper">
                  <div className="chart-bars">
                    {monthlyUserData.map((data) => {
                      const maxCount = Math.max(...monthlyUserData.map(d => d.count), 1)
                      const height = maxCount > 0 ? (data.count / maxCount) * 100 : 0
                      return (
                        <div key={data.month} className="chart-bar-group">
                          <div className="chart-bar-container">
                            <div 
                              className="chart-bar"
                              style={{ height: `${height}%` }}
                              title={`${data.month}: ${formatNumber(data.count)} users`}
                            >
                              {data.count > 0 && (
                                <span className="chart-bar-value">{formatNumber(data.count)}</span>
                              )}
                            </div>
                          </div>
                          <div className="chart-bar-label">{data.month}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* Key Metrics */}
            {stats && (
              <section className="metrics-section">
                <div className="section-header">
                  <h2 className="section-title">Key Metrics</h2>
                  <p className="section-description">Overview of community engagement</p>
                </div>
                <div className="metrics-grid">
                  <div className="metric-card metric-card-primary">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Total Users</div>
                      <div className="metric-card-value">{formatNumber(stats.totalUsers)}</div>
                      <div className="metric-card-description">Registered community members</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-accent">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Blood Donors</div>
                      <div className="metric-card-value">{formatNumber(stats.totalBloodDonors)}</div>
                      <div className="metric-card-description">Active blood donors</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-success">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Volunteers</div>
                      <div className="metric-card-value">{formatNumber(stats.totalVolunteers)}</div>
                      <div className="metric-card-description">Active volunteers</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-warning">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.06211 22.0329 6.39464C21.7564 5.72717 21.351 5.12075 20.84 4.61Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Donations</div>
                      <div className="metric-card-value">{formatNumber(stats.totalDonations)}</div>
                      <div className="metric-card-description">Total donation records</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-info">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Issue Reports</div>
                      <div className="metric-card-value">{formatNumber(stats.totalIssueReports)}</div>
                      <div className="metric-card-description">Reported issues</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Wards Section */}
            {wards.length > 0 && (
              <section className="wards-section">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Ward Analytics</h2>
                    <p className="section-description">Detailed statistics by ward</p>
                  </div>
                  <div className="section-badge">{formatNumber(wards.length)} Wards</div>
                </div>
                <div className="wards-grid">
                  {wards.map((ward) => (
                    <div key={ward.id} className="ward-card">
                      <div className="ward-card-header">
                        <div>
                          <h3 className="ward-name">{ward.ward_name.trim()}</h3>
                          <div className="ward-number">Ward #{ward.ward_number}</div>
                        </div>
                      </div>
                      
                      <div className="ward-card-body">
                        <div className="ward-info">
                          <div className="ward-info-item">
                            <span className="ward-info-label">Councillor</span>
                            <span className="ward-info-value">{ward.councillorName}</span>
                          </div>
                          <div className="ward-info-item">
                            <span className="ward-info-label">Municipality</span>
                            <span className="ward-info-value">{ward.municipalityName}</span>
                          </div>
                        </div>

                        {ward.analytics && (
                          <div className="ward-stats">
                            <div className="ward-stats-header">Statistics</div>
                            <div className="ward-stats-grid">
                              <div className="ward-stat-item">
                                <div className="ward-stat-icon">👥</div>
                                <div className="ward-stat-content">
                                  <div className="ward-stat-value">{formatNumber(ward.analytics.users)}</div>
                                  <div className="ward-stat-label">Users</div>
                                </div>
                              </div>
                              <div className="ward-stat-item">
                                <div className="ward-stat-icon">🩸</div>
                                <div className="ward-stat-content">
                                  <div className="ward-stat-value">{formatNumber(ward.analytics.donors)}</div>
                                  <div className="ward-stat-label">Donors</div>
                                </div>
                              </div>
                              <div className="ward-stat-item">
                                <div className="ward-stat-icon">🤝</div>
                                <div className="ward-stat-content">
                                  <div className="ward-stat-value">{formatNumber(ward.analytics.volunteers)}</div>
                                  <div className="ward-stat-label">Volunteers</div>
                                </div>
                              </div>
                              <div className="ward-stat-item">
                                <div className="ward-stat-icon">❤️</div>
                                <div className="ward-stat-content">
                                  <div className="ward-stat-value">{formatNumber(ward.analytics.donations)}</div>
                                  <div className="ward-stat-label">Donations</div>
                                </div>
                              </div>
                              <div className="ward-stat-item">
                                <div className="ward-stat-icon">📋</div>
                                <div className="ward-stat-content">
                                  <div className="ward-stat-value">{formatNumber(ward.analytics.issueReports)}</div>
                                  <div className="ward-stat-label">Reports</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
