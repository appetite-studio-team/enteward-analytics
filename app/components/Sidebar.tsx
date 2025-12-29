'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { LayoutDashboard, Users, Star, Settings, Menu } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Users', href: '/users', icon: Users },
    { name: 'Interests', href: '/interests', icon: Star },
    { name: 'Admin', href: '/admin', icon: Settings },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-gray-900 text-white z-40 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:z-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-lg"
                priority
              />
              <div>
                <h1 className="text-xl font-bold text-white">Enteward</h1>
                <p className="text-xs text-gray-400">Admin Analytics</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              const IconComponent = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
