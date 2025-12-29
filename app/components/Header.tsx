'use client'

import { useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'
import { useState, useEffect } from 'react'
import type { Models } from 'appwrite'
import { Menu, ChevronDown, Globe, LogOut } from 'lucide-react'

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
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
            Clear Cache
          </button>
          <div className="relative">
            <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              Add New
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Globe className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative">
            <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <span className="text-sm font-medium text-gray-700">EN</span>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
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
