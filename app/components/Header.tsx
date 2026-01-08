'use client'

import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'
import { useState, useEffect } from 'react'
import type { Models } from 'appwrite'
import { ChevronDown, LogOut } from 'lucide-react'

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const account = getAccount()
        const session = await account.get()
        setUser(session)
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    try {
      const account = getAccount()
      await account.deleteSession('current')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-end px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden md:block">
                {user?.email?.split('@')[0] || 'Admin'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
