'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'
import type { Models } from 'appwrite'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const account = getAccount()
        const session = await account.get()
        setUser(session)
        setChecking(false)
        setLoading(false)
      } catch (error) {
        // User is not authenticated, redirect to login
        console.error('Auth check failed:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    try {
      const account = getAccount()
      await account.deleteSession('current')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (checking || loading) {
    return (
      <div className="admin-loading">
        <div className="spinner-large"></div>
        <p>Checking authentication...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1 className="admin-title">Admin Dashboard</h1>
            <p className="admin-subtitle">Welcome back, {user.email}</p>
          </div>
          <button onClick={handleLogout} className="logout-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 17L2 12M2 12L7 7M2 12H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-welcome-card">
          <div className="admin-welcome-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.1 6 14 6.9 14 8C14 9.1 13.1 10 12 10C10.9 10 10 9.1 10 8C10 6.9 10.9 6 12 6ZM16 17.58C15.82 17.84 15.55 18 15.24 18H8.76C8.45 18 8.18 17.84 8 17.58C7.82 17.32 7.75 17 7.8 16.7L8.5 13.5C8.5 12.67 9.17 12 10 12H14C14.83 12 15.5 12.67 15.5 13.5L16.2 16.7C16.25 17 16.18 17.32 16 17.58Z" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="admin-welcome-title">Authentication Successful</h2>
          <p className="admin-welcome-text">
            You are now authenticated and can access the admin dashboard.
          </p>
          <div className="admin-user-info">
            <div className="admin-info-item">
              <span className="admin-info-label">Email:</span>
              <span className="admin-info-value">{user.email}</span>
            </div>
            <div className="admin-info-item">
              <span className="admin-info-label">User ID:</span>
              <span className="admin-info-value">{user.$id}</span>
            </div>
            <div className="admin-info-item">
              <span className="admin-info-label">Status:</span>
              <span className="admin-info-value admin-status-verified">Verified</span>
            </div>
          </div>
        </div>

        <div className="admin-actions">
          <a href="/" className="admin-action-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10L9 4M3 10L9 16M3 10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

