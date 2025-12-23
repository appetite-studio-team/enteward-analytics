'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

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

      // Fetch and process interested wards data
      try {
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime()
        const interestedWardsResponse = await fetch(`/api/interested-wards?t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        if (interestedWardsResponse.ok) {
          const interestedWardsData = await interestedWardsResponse.json()
          const interestedWards: InterestedWard[] = interestedWardsData.data || []
          
          // Calculate analytics - use ward_number to match with wards
          const countByWard: { [wardNumber: string]: number } = {}
          const countByDistrict: { [district: string]: number } = {}
          // Store ward details for each ward number
          const wardDetailsMap: { [wardNumber: string]: { district?: string; panchayathName?: string; type?: string } } = {}
          
          interestedWards.forEach((item: InterestedWard) => {
            const wardNumber = String(item.ward_number || item.ward || item.wardId || item.ward_id || 'unknown')
            countByWard[wardNumber] = (countByWard[wardNumber] || 0) + 1
            
            // Count by district
            const district = String(item.District || item.district || 'Unknown')
            countByDistrict[district] = (countByDistrict[district] || 0) + 1
            
            // Store ward details (use first occurrence for each ward)
            if (!wardDetailsMap[wardNumber]) {
              wardDetailsMap[wardNumber] = {
                district: district !== 'Unknown' ? district : undefined,
                panchayathName: item.panchayath_name || item.panchayathName || undefined,
                type: item.type || undefined
              }
            }
          })
          
          // Get top wards with ward names and details - match by ward_number
          const topWards = Object.entries(countByWard)
            .map(([wardNumber, count]) => {
              const ward = wardsList.find(w => String(w.ward_number) === wardNumber)
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
          
          // Get total count from meta if available, otherwise use array length
          const totalCount = interestedWardsData.meta?.total_count || interestedWards.length
          
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

      // Fetch interested councillors
      try {
        // Add timestamp to prevent caching
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
        // Don't set error state, just log it
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
                <h1 className="dashboard-title">Interested Wards Analytics</h1>
                <p className="dashboard-subtitle">Community interest in different wards</p>
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
            <Link href="/" className="btn-nav">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L2 8L8 14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Home
            </Link>
            <Link href="/users" className="btn-nav">
              Users
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
            {/* Interested Wards Section */}
            {interestedWardAnalytics && (
              <section className="metrics-section">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Interested Wards Analytics</h2>
                    <p className="section-description">Community interest in different wards</p>
                  </div>
                  <div className="section-badge">
                    {formatNumber(interestedWardAnalytics.totalCount)} Total Interests
                  </div>
                </div>
                <div className="metrics-grid">
                  <div className="metric-card metric-card-primary">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Total Interests</div>
                      <div className="metric-card-value">{formatNumber(interestedWardAnalytics.totalCount)}</div>
                      <div className="metric-card-description">Total ward interests registered</div>
                    </div>
                  </div>
                  <div className="metric-card metric-card-accent">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 21L12 2L21 21H3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 18V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Districts</div>
                      <div className="metric-card-value">{formatNumber(interestedWardAnalytics.districtCount)}</div>
                      <div className="metric-card-description">Districts with registered interests</div>
                    </div>
                  </div>
                </div>
                {Object.keys(interestedWardAnalytics.countByDistrict).length > 0 && (
                  <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-gray-900)' }}>District Wise Count</h3>
                    <div className="wards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                      {Object.entries(interestedWardAnalytics.countByDistrict)
                        .sort(([, a], [, b]) => b - a)
                        .map(([district, count]) => (
                          <div key={district} className="ward-card">
                            <div className="ward-card-header">
                              <div>
                                <h3 className="ward-name" style={{ fontSize: '1rem' }}>
                                  {district}
                                </h3>
                              </div>
                            </div>
                            <div className="ward-card-body">
                              <div className="ward-stats">
                                <div className="ward-stats-grid" style={{ gridTemplateColumns: '1fr' }}>
                                  <div className="ward-stat-item">
                                    <div className="ward-stat-icon">📍</div>
                                    <div className="ward-stat-content">
                                      <div className="ward-stat-value">{formatNumber(count)}</div>
                                      <div className="ward-stat-label">Interests</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Interested Councillors Section */}
            {interestedCouncillors.length > 0 && (
              <section className="metrics-section">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Interested Councillors</h2>
                    <p className="section-description">Councillors who have shown interest in the platform</p>
                  </div>
                  <div className="section-badge">
                    {formatNumber(interestedCouncillors.length)} Councillors
                  </div>
                </div>
                <div className="councillors-list">
                  {interestedCouncillors.map((councillor) => {
                    const createdDate = formatDate(councillor.date_created || councillor.dateCreated || councillor.created_at || councillor.createdAt)
                    return (
                      <div key={councillor.id} className="councillor-list-item">
                        <div className="councillor-list-main">
                          <div className="councillor-list-header">
                            <h3 className="councillor-list-name">{councillor.name}</h3>
                            {createdDate && (
                              <div className="councillor-list-date">
                                <span className="councillor-date-text">{createdDate.date}</span>
                                <span className="councillor-time-text">{createdDate.time}</span>
                              </div>
                            )}
                          </div>
                          <div className="councillor-list-details">
                            <div className="councillor-detail-item">
                              <span className="councillor-detail-label">Ward</span>
                              <span className="councillor-detail-value">#{councillor.ward_number}</span>
                            </div>
                            <div className="councillor-detail-item">
                              <span className="councillor-detail-label">District</span>
                              <span className="councillor-detail-value">{councillor.district}</span>
                            </div>
                            <div className="councillor-detail-item">
                              <span className="councillor-detail-label">Panchayath</span>
                              <span className="councillor-detail-value">{councillor.panchayath_name}</span>
                            </div>
                            <div className="councillor-detail-item">
                              <span className="councillor-detail-label">Type</span>
                              <span className="councillor-detail-value">{councillor.panchayath_type}</span>
                            </div>
                            <div className="councillor-detail-item">
                              <span className="councillor-detail-label">Phone</span>
                              <span className="councillor-detail-value">
                                <a 
                                  href={`tel:${councillor.phone_number}`}
                                  className="phone-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {councillor.phone_number}
                                </a>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

