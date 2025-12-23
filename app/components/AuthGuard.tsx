'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAccount } from '@/lib/appwrite'
import type { Models } from 'appwrite'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)

  // Pages that don't require authentication
  const publicPages = ['/login']

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for public pages
      if (publicPages.includes(pathname)) {
        setIsAuthenticated(true)
        return
      }

      try {
        const account = getAccount()
        const session = await account.get()
        setUser(session)
        setIsAuthenticated(true)
      } catch (error) {
        // User is not authenticated
        setIsAuthenticated(false)
        // Redirect to login if not on a public page
        if (!publicPages.includes(pathname)) {
          router.push('/login')
        }
      }
    }

    checkAuth()
  }, [pathname, router])

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="auth-loading">
        <div className="spinner-large"></div>
        <p>Checking authentication...</p>
      </div>
    )
  }

  // If on a public page, show children
  if (publicPages.includes(pathname)) {
    return <>{children}</>
  }

  // If not authenticated and not on public page, don't render (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // User is authenticated, render children
  return <>{children}</>
}

