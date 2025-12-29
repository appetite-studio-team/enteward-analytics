'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'
import { 
  AlertCircle, Users, Calendar, Clock, BarChart, 
  CheckCircle, XCircle, TrendingUp 
} from 'lucide-react'

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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
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

      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(startOfToday)
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
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

        if (userDate >= startOfToday) currentDayCount++
        if (userDate >= startOfWeek) currentWeekCount++
        if (userDate >= startOfMonth) currentMonthCount++
        if (userDate >= startOfLastMonth && userDate <= endOfLastMonth) lastMonthCount++
        if (userDate >= startOfLastWeek && userDate < startOfWeek) lastWeekCount++

        const lastLogin = getLastLoginDate(user)
        const loginCount = getLoginCount(user)
        totalLoginCount += loginCount

        if (!lastLogin) {
          neverLoggedIn++
          inactiveUsers++
        } else {
          if (lastLogin >= thirtyDaysAgo) {
            activeUsers++
          } else {
            inactiveUsers++
          }

          if (lastLogin >= startOfToday) loggedInToday++
          if (lastLogin >= startOfWeek) loggedInThisWeek++
          if (lastLogin >= startOfMonth) loggedInThisMonth++
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users Analytics</h1>
          <p className="text-gray-600 mt-1">Comprehensive user statistics and insights</p>
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

      {metrics && (
        <>
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">User Metrics</h2>
                <p className="text-sm text-gray-600 mt-1">Key statistics and growth indicators</p>
              </div>
              <div className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                {formatNumber(metrics.totalUsers)} Total Users
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <div className="metric-card border-t-4 border-t-primary-500">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalUsers)}</p>
              </div>

              <div className="metric-card border-t-4 border-t-blue-500">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.currentMonth)}</p>
              </div>

              <div className="metric-card border-t-4 border-t-green-500">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">This Week</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.currentWeek)}</p>
              </div>

              <div className="metric-card border-t-4 border-t-yellow-500">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Today</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.currentDay)}</p>
              </div>

              <div className="metric-card border-t-4 border-t-purple-500">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Last Month</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.lastMonth)}</p>
              </div>

              <div className="metric-card border-t-4 border-t-indigo-500">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Last Week</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.lastWeek)}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Login Activity</h2>
                <p className="text-sm text-gray-600 mt-1">User engagement and login statistics</p>
              </div>
              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                {formatNumber(metrics.loginRate)}% Active Rate
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="metric-card border-t-4 border-t-green-500">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Active Users</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.activeUsers)}</p>
                <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
              </div>

              <div className="metric-card border-t-4 border-t-red-500">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Inactive Users</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.inactiveUsers)}</p>
                <p className="text-xs text-gray-500 mt-2">No login in 30 days</p>
              </div>

              <div className="metric-card border-t-4 border-t-blue-500">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Logged In Today</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.loggedInToday)}</p>
                <p className="text-xs text-gray-500 mt-2">Active today</p>
              </div>

              <div className="metric-card border-t-4 border-t-purple-500">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600 mb-1">Login Rate</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.loginRate)}%</p>
                <p className="text-xs text-gray-500 mt-2">Active percentage</p>
              </div>
            </div>
          </div>
        </>
      )}

      {monthlyData.length > 0 && (
        <div className="chart-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">User Growth Trend</h2>
              <p className="text-sm text-gray-600 mt-1">Monthly user registration over time</p>
            </div>
          </div>
          <div className="h-80 w-full overflow-x-auto">
            <svg 
              className="w-full h-full min-w-full" 
              viewBox={`0 0 ${Math.max(monthlyData.length * 80, 800)} 320`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="userLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
                    x2={Math.max(monthlyData.length * 80, 800) - 40}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                )
              })}
              
              {/* Calculate points for the line */}
              {(() => {
                const maxCount = Math.max(...monthlyData.map(d => d.count), 1)
                const chartWidth = Math.max(monthlyData.length * 80, 800) - 80
                const chartHeight = 280
                
                const points = monthlyData.map((data, index) => {
                  const x = 40 + (index / Math.max(monthlyData.length - 1, 1)) * chartWidth
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
                      fill="url(#userLineGradient)"
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
                        <text
                          x={point.x}
                          y={330}
                          textAnchor="middle"
                          fontSize="10"
                          fill="#9ca3af"
                        >
                          {point.data.year}
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
    </div>
  )
}
