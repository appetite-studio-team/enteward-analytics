'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAccount } from '@/lib/appwrite'
import type { Models } from 'appwrite'
import { Shield, Home } from 'lucide-react'

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
        console.error('Auth check failed:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  if (checking || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user.email}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Successful</h2>
          <p className="text-gray-600">
            You are now authenticated and can access the admin dashboard.
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
            <span className="text-sm font-medium text-gray-600">Email:</span>
            <span className="text-sm font-semibold text-gray-900">{user.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
            <span className="text-sm font-medium text-gray-600">User ID:</span>
            <span className="text-sm font-semibold text-gray-900 break-all">{user.$id}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
              Verified
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-primary-500/30"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
