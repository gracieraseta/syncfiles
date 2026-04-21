import React, { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import Login          from './pages/Login'
import Register       from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard      from './pages/Dashboard'
import Profiles       from './pages/Profiles'
import Conflicts      from './pages/Conflicts'
import Logs           from './pages/Logs'

type AuthPage = 'login' | 'register' | 'forgot'
type AppPage  = 'dashboard' | 'profiles' | 'conflicts' | 'logs'

function AppContent() {
  const { user, logout }       = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [authPage, setAuthPage] = useState<AuthPage>('login')
  const [appPage,  setAppPage]  = useState<AppPage>('dashboard')

  // ── Non connecté → pages auth ────────────────────────────────
  if (!user) {
    if (authPage === 'register') return <Register  onNavigate={setAuthPage} />
    if (authPage === 'forgot')   return <ForgotPassword onNavigate={setAuthPage} />
    return <Login onNavigate={setAuthPage} />
  }

  // ── Connecté → app principale ─────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* ── Topbar ── */}
<div className="topbar">
  <div className="logo">
    <div style={{
      width: 34, height: 34,
      background: '#2563EB',
      borderRadius: 9,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1.5px solid rgba(37,99,235,.4)'
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
          stroke="#fff" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 16l3-3 3 3" stroke="#fff"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 13v5" stroke="#fff"
          strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </div>
    <div>
      <div style={{
        fontSize: 14, fontWeight: 700,
        color: 'var(--text)', letterSpacing: '-.02em',
        lineHeight: 1.1
      }}>
        SyncFiles
      </div>
      <div style={{
        fontSize: 9, color: 'var(--text3)',
        letterSpacing: '.05em', textTransform: 'uppercase'
      }}>
      
      </div>
    </div>
  </div>

        <div style={{ flex: 1 }} />

        {/* Toggle dark/light */}
        <button
          onClick={toggleTheme}
          style={{
            background:   'var(--surface2)',
            border:       '1px solid var(--border2)',
            borderRadius: 8,
            padding:      '6px 12px',
            fontSize:     12,
            fontWeight:   500,
            color:        'var(--text2)',
            cursor:       'pointer',
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            marginRight:  8
          }}
        >
          {theme === 'light' ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Sombre
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M11 3.5L9.5 5M4.5 11L3 12.5"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Clair
            </>
          )}
        </button>

        {/* Avatar + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width:           32,
            height:          32,
            borderRadius:    '50%',
            background:      'var(--accent-bg)',
            border:          '1px solid var(--border2)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        11,
            fontWeight:      600,
            color:           'var(--accent-text)'
          }}>
            {user.nom.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>
            {user.nom}
          </span>
          <button
            onClick={logout}
            style={{
              background:   'none',
              border:       '1px solid var(--border2)',
              borderRadius: 6,
              padding:      '4px 10px',
              fontSize:     12,
              color:        'var(--text3)',
              cursor:       'pointer',
              fontFamily:   'var(--font)'
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="layout">

        {/* ── Sidebar ── */}
        <div className="sidebar">
          <div className="nav-section">Navigation</div>

          <button
            className={`nav-item ${appPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setAppPage('dashboard')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1"
                stroke="currentColor" strokeWidth="1.2"/>
              <rect x="9" y="2" width="5" height="5" rx="1"
                stroke="currentColor" strokeWidth="1.2"/>
              <rect x="2" y="9" width="5" height="5" rx="1"
                stroke="currentColor" strokeWidth="1.2"/>
              <rect x="9" y="9" width="5" height="5" rx="1"
                stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Dashboard
          </button>

          <button
            className={`nav-item ${appPage === 'profiles' ? 'active' : ''}`}
            onClick={() => setAppPage('profiles')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 10h10M3 6h10" stroke="currentColor"
                strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Mes profils
          </button>

          <button
            className={`nav-item ${appPage === 'conflicts' ? 'active' : ''}`}
            onClick={() => setAppPage('conflicts')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor"
                strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Conflits
          </button>

          <button
            className={`nav-item ${appPage === 'logs' ? 'active' : ''}`}
            onClick={() => setAppPage('logs')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 5h10M3 8h7M3 11h5" stroke="currentColor"
                strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Logs
          </button>

          <div className="nav-section" style={{ marginTop: 'auto' }}>Compte</div>

          <div style={{
            padding:    '8px 10px',
            fontSize:   12,
            color:      'var(--text3)',
            lineHeight: 1.5
          }}>
            <div style={{ fontWeight: 500, color: 'var(--text2)' }}>{user.nom}</div>
            <div>{user.email}</div>
          </div>
        </div>

        {/* ── Page content ── */}
        <div className="content">
          {appPage === 'dashboard' && <Dashboard  onNavigate={setAppPage} />}
          {appPage === 'profiles'  && <Profiles   />}
          {appPage === 'conflicts' && <Conflicts  />}
          {appPage === 'logs'      && <Logs       />}
        </div>

      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}