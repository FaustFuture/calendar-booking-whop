'use client'

import { UserCog, Users } from 'lucide-react'

interface RoleSwitcherProps {
  currentRole: 'admin' | 'member'
  onRoleChange: (role: 'admin' | 'member') => void
}

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="inline-flex items-center p-1.5 bg-zinc-800 rounded-2xl border border-zinc-700/50">
        <button
          onClick={() => onRoleChange('admin')}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors
            ${currentRole === 'admin'
              ? 'bg-emerald-500 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            }
          `}
        >
          <UserCog className="w-5 h-5" />
          Admin View
        </button>
        <button
          onClick={() => onRoleChange('member')}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors
            ${currentRole === 'member'
              ? 'bg-emerald-500 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
            }
          `}
        >
          <Users className="w-5 h-5" />
          Member View
        </button>
      </div>
    </div>
  )
}
