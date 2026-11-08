import { ShieldAlert, MapPin, ScrollText, Activity, BarChart3, MessageSquare, Zap, Database } from 'lucide-react'

export type PageId = 'analyse' | 'map' | 'log' | 'priority' | 'graphs' | 'chat'

const NAV: { id: PageId; icon: typeof ShieldAlert; label: string }[] = [
  { id: 'analyse',  icon: ShieldAlert,    label: 'Analyze Crisis'     },
  { id: 'map',      icon: MapPin,         label: 'GIS Command Map'    },
  { id: 'log',      icon: ScrollText,     label: 'Crisis Log'         },
  
  { id: 'graphs',   icon: BarChart3,      label: 'Analytics Dashboard'},
  { id: 'chat',     icon: MessageSquare,  label: 'AI Assistant'       },
]

interface Props {
  activePage: PageId
  onNavigate: (p: PageId) => void
}

export default function Sidebar({ activePage, onNavigate }: Props) {
  return (
    <aside
      className="w-52 flex-shrink-0 flex flex-col h-full"
      style={{ background: '#070c18', borderRight: '1px solid #1a2e4a' }}
    >
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: '1px solid #1a2e4a' }}>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Zap className="w-7 h-7" style={{ color: '#06b6d4' }} />
            <span className="absolute inset-0 blur-sm opacity-50" style={{ color: '#06b6d4' }}>
              <Zap className="w-7 h-7" />
            </span>
          </div>
          <div>
            <p
              className="font-bold tracking-widest text-sm uppercase leading-none"
              style={{ fontFamily: 'Rajdhani, sans-serif', color: '#06b6d4' }}
            >
              CRISENTRA AI
            </p>
            <p className="text-[9px] tracking-wider mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#475569' }}>
              TACTICAL v2.5
            </p>
          </div>
        </div>
      </div>

      {/* System status */}
      <div
        className="px-4 py-2 flex items-center gap-2"
        style={{ borderBottom: '1px solid #1a2e4a', background: 'rgba(6,182,212,0.05)' }}
      >
        <span className="dot-pulse w-2 h-2 rounded-full flex-shrink-0" style={{ color: '#3fb950', background: '#3fb950' }} />
        <span className="text-[9px] tracking-widest uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#3fb950' }}>
          SYSTEM ONLINE
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <p
          className="px-4 mb-2 text-[9px] tracking-widest uppercase"
          style={{ fontFamily: 'JetBrains Mono, monospace', color: '#334155' }}
        >
          Modules
        </p>
        {NAV.map(({ id, icon: Icon, label }) => {
          const active = activePage === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-150"
              style={{
                background: active ? 'rgba(6,182,212,0.10)' : 'transparent',
                borderRight: active ? '2px solid #06b6d4' : '2px solid transparent',
                borderLeft: active ? '2px solid rgba(6,182,212,0.3)' : '2px solid transparent',
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? '#06b6d4' : '#475569' }}
              />
              <span
                className="text-sm font-medium tracking-wide"
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  color: active ? '#e2e8f0' : '#64748b',
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #1a2e4a' }}>
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-3 h-3" style={{ color: '#06b6d4' }} />
          <span className="text-[9px] tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#06b6d4' }}>
            PERSISTENT DB CONNECTED
          </span>
        </div>
        <p className="text-[9px] tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#334155' }}>
          NLP ENGINE · ACTIVE
        </p>
      </div>
    </aside>
  )
}
