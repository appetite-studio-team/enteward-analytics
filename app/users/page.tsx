'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'

interface User {
  $id: string
  $createdAt: string
  [key: string]: any
}

interface MonthlyData {
  month: string
  count: number
  monthNumber: number
  year: number
}

interface UserMetrics {
  totalUsers: number
  currentMonth: number
  currentWeek: number
  currentDay: number
  lastMonth: number
  lastWeek: number
  // Login metrics
  activeUsers: number
  inactiveUsers: number
  loggedInToday: number
  loggedInThisWeek: number
  loggedInThisMonth: number
  neverLoggedIn: number
  loginRate: number
  averageLoginFrequency: number
}

export default function UsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [metrics, setMetrics] = useState<UserMetrics | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
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

  const getDateField = (user: User): Date | null => {
    const dateStr = user.joinedDate || user.joined_date || user.$createdAt || user.createdAt || user.created_at
    if (!dateStr) return null
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  }

  const getLastLoginDate = (user: User): Date | null => {
    const dateStr = user.lastLogin || user.last_login || user.lastLoginDate || user.lastLoginAt || 
                    user.last_login_date || user.last_login_at || user.lastActive || user.last_active
    if (!dateStr) return null
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  }

  const getLoginCount = (user: User): number => {
    return user.loginCount || user.login_count || user.totalLogins || user.total_logins || 0
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const timestamp = new Date().getTime()
      const usersResponse = await fetch(`/api/users?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!usersResponse.ok) {
        const errorData = await usersResponse.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }

      const usersData = await usersResponse.json()
      const usersList: User[] = usersData.documents || []
      setUsers(usersList)

      // Calculate metrics
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(startOfToday)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()) // Start of week (Sunday)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const startOfLastWeek = new Date(startOfWeek)
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

      let currentMonthCount = 0
      let currentWeekCount = 0
      let currentDayCount = 0
      let lastMonthCount = 0
      let lastWeekCount = 0

      // Login metrics
      let activeUsers = 0
      let inactiveUsers = 0
      let loggedInToday = 0
      let loggedInThisWeek = 0
      let loggedInThisMonth = 0
      let neverLoggedIn = 0
      let totalLoginCount = 0
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      usersList.forEach((user) => {
        const userDate = getDateField(user)
        if (!userDate) return

        // Registration metrics
        if (userDate >= startOfToday) {
          currentDayCount++
        }
        if (userDate >= startOfWeek) {
          currentWeekCount++
        }
        if (userDate >= startOfMonth) {
          currentMonthCount++
        }
        if (userDate >= startOfLastMonth && userDate <= endOfLastMonth) {
          lastMonthCount++
        }
        if (userDate >= startOfLastWeek && userDate < startOfWeek) {
          lastWeekCount++
        }

        // Login metrics
        const lastLogin = getLastLoginDate(user)
        const loginCount = getLoginCount(user)
        totalLoginCount += loginCount

        if (!lastLogin) {
          neverLoggedIn++
          inactiveUsers++
        } else {
          // Active users (logged in within last 30 days)
          if (lastLogin >= thirtyDaysAgo) {
            activeUsers++
          } else {
            inactiveUsers++
          }

          // Login activity by period
          if (lastLogin >= startOfToday) {
            loggedInToday++
          }
          if (lastLogin >= startOfWeek) {
            loggedInThisWeek++
          }
          if (lastLogin >= startOfMonth) {
            loggedInThisMonth++
          }
        }
      })

      const loginRate = usersList.length > 0 
        ? ((activeUsers / usersList.length) * 100) 
        : 0
      const averageLoginFrequency = usersList.length > 0 
        ? totalLoginCount / usersList.length 
        : 0

      setMetrics({
        totalUsers: usersList.length,
        currentMonth: currentMonthCount,
        currentWeek: currentWeekCount,
        currentDay: currentDayCount,
        lastMonth: lastMonthCount,
        lastWeek: lastWeekCount,
        activeUsers,
        inactiveUsers,
        loggedInToday,
        loggedInThisWeek,
        loggedInThisMonth,
        neverLoggedIn,
        loginRate: Math.round(loginRate * 10) / 10,
        averageLoginFrequency: Math.round(averageLoginFrequency * 10) / 10,
      })

      // Calculate monthly data for line chart
      const monthlyCounts: { [key: string]: number } = {}
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ]

      usersList.forEach((user) => {
        const userDate = getDateField(user)
        if (!userDate) return

        const year = userDate.getFullYear()
        const month = userDate.getMonth() + 1
        const key = `${year}-${month.toString().padStart(2, '0')}`
        monthlyCounts[key] = (monthlyCounts[key] || 0) + 1
      })

      // Sort by year and month, then convert to array
      const sortedKeys = Object.keys(monthlyCounts).sort()
      const monthlyDataArray: MonthlyData[] = sortedKeys.map((key) => {
        const [year, month] = key.split('-')
        return {
          month: months[parseInt(month) - 1],
          count: monthlyCounts[key],
          monthNumber: parseInt(month),
          year: parseInt(year),
        }
      })

      setMonthlyData(monthlyDataArray)
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
                <h1 className="dashboard-title">Users Analytics</h1>
                <p className="dashboard-subtitle">Comprehensive user statistics and insights</p>
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
            <p>Loading user data...</p>
          </div>
        ) : (
          <>
            {/* Metrics Section */}
            {metrics && (
              <section className="metrics-section">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">User Metrics</h2>
                    <p className="section-description">Key statistics and growth indicators</p>
                  </div>
                  <div className="section-badge">
                    {formatNumber(metrics.totalUsers)} Total Users
                  </div>
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
                      <div className="metric-card-value">{formatNumber(metrics.totalUsers)}</div>
                      <div className="metric-card-description">All registered users</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-accent">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">This Month</div>
                      <div className="metric-card-value">{formatNumber(metrics.currentMonth)}</div>
                      <div className="metric-card-description">New users this month</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-success">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 14L10 16L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">This Week</div>
                      <div className="metric-card-value">{formatNumber(metrics.currentWeek)}</div>
                      <div className="metric-card-description">New users this week</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-warning">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2V6M12 18V22M4 12H8M16 12H20M19.0711 4.92893L16.2426 7.75736M7.75736 16.2426L4.92893 19.0711M19.0711 19.0711L16.2426 16.2426M7.75736 7.75736L4.92893 4.92893" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Today</div>
                      <div className="metric-card-value">{formatNumber(metrics.currentDay)}</div>
                      <div className="metric-card-description">New users today</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-info">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 16L12 11L16 15L21 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 10V3H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Last Month</div>
                      <div className="metric-card-value">{formatNumber(metrics.lastMonth)}</div>
                      <div className="metric-card-description">Users joined last month</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-accent">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M22 12H18M6 12H2M12 2V6M12 18V22M20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Last Week</div>
                      <div className="metric-card-value">{formatNumber(metrics.lastWeek)}</div>
                      <div className="metric-card-description">Users joined last week</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Login Metrics Section */}
            {metrics && (
              <section className="metrics-section">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Login Activity</h2>
                    <p className="section-description">User engagement and login statistics</p>
                  </div>
                  <div className="section-badge">
                    {formatNumber(metrics.loginRate)}% Active Rate
                  </div>
                </div>
                <div className="metrics-grid">
                  <div className="metric-card metric-card-success">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Active Users</div>
                      <div className="metric-card-value">{formatNumber(metrics.activeUsers)}</div>
                      <div className="metric-card-description">Logged in last 30 days</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-warning">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Inactive Users</div>
                      <div className="metric-card-value">{formatNumber(metrics.inactiveUsers)}</div>
                      <div className="metric-card-description">No login in 30 days</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-primary">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2V6M12 18V22M4 12H8M16 12H20M19.0711 4.92893L16.2426 7.75736M7.75736 16.2426L4.92893 19.0711M19.0711 19.0711L16.2426 16.2426M7.75736 7.75736L4.92893 4.92893" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Logged In Today</div>
                      <div className="metric-card-value">{formatNumber(metrics.loggedInToday)}</div>
                      <div className="metric-card-description">Active today</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-accent">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">This Week</div>
                      <div className="metric-card-value">{formatNumber(metrics.loggedInThisWeek)}</div>
                      <div className="metric-card-description">Logged in this week</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-info">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 14L10 16L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">This Month</div>
                      <div className="metric-card-value">{formatNumber(metrics.loggedInThisMonth)}</div>
                      <div className="metric-card-description">Logged in this month</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-warning">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Never Logged In</div>
                      <div className="metric-card-value">{formatNumber(metrics.neverLoggedIn)}</div>
                      <div className="metric-card-description">No login recorded</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-primary">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 16L12 11L16 15L21 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 10V3H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Login Rate</div>
                      <div className="metric-card-value">{formatNumber(metrics.loginRate)}%</div>
                      <div className="metric-card-description">Active user percentage</div>
                    </div>
                  </div>

                  <div className="metric-card metric-card-accent">
                    <div className="metric-card-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="metric-card-content">
                      <div className="metric-card-label">Avg Login Frequency</div>
                      <div className="metric-card-value">{formatNumber(metrics.averageLoginFrequency)}</div>
                      <div className="metric-card-description">Average logins per user</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Monthly Chart Section */}
            {monthlyData.length > 0 && (
              <section className="chart-section">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">User Growth Trend</h2>
                    <p className="section-description">Monthly user registration over time</p>
                  </div>
                </div>
                <div className="chart-wrapper">
                  <div className="line-chart-container">
                    {(() => {
                      const maxCount = Math.max(...monthlyData.map(d => d.count), 1)
                      const chartHeight = 240
                      const chartWidth = Math.max(monthlyData.length * 80, 800)
                      
                      // Calculate points for the line
                      const points = monthlyData.map((data, index) => {
                        const x = (index / Math.max(monthlyData.length - 1, 1)) * (chartWidth - 80) + 40
                        const y = chartHeight - (data.count / maxCount) * (chartHeight - 40) - 20
                        return { x, y, data }
                      })
                      
                      // Create path string
                      const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                      const areaPath = `${pathData} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`
                      
                      return (
                        <svg 
                          className="line-chart" 
                          viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <defs>
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Grid lines */}
                          {Array.from({ length: 5 }).map((_, i) => {
                            const y = 20 + (i * (chartHeight - 40) / 4)
                            return (
                              <line
                                key={`grid-${i}`}
                                x1="40"
                                y1={y}
                                x2={chartWidth - 40}
                                y2={y}
                                stroke="var(--color-gray-200)"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                              />
                            )
                          })}
                          
                          {/* Area under line */}
                          <path
                            d={areaPath}
                            fill="url(#lineGradient)"
                          />
                          
                          {/* Line */}
                          <path
                            d={pathData}
                            fill="none"
                            stroke="var(--color-primary)"
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
                                fill="var(--color-primary)"
                                stroke="var(--color-white)"
                                strokeWidth="2"
                              />
                              {/* Tooltip value */}
                              <text
                                x={point.x}
                                y={point.y - 10}
                                textAnchor="middle"
                                fontSize="10"
                                fill="var(--color-gray-700)"
                                fontWeight="600"
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
                                y={chartHeight + 20}
                                textAnchor="middle"
                                fontSize="11"
                                fill="var(--color-gray-600)"
                                fontWeight="500"
                              >
                                {point.data.month}
                              </text>
                              <text
                                x={point.x}
                                y={chartHeight + 35}
                                textAnchor="middle"
                                fontSize="9"
                                fill="var(--color-gray-500)"
                              >
                                {point.data.year}
                              </text>
                            </g>
                          ))}
                        </svg>
                      )
                    })()}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

