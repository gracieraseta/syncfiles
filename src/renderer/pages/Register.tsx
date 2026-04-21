import React, { useState } from 'react'
import { useAuth }  from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

interface Props {
  onNavigate: (page: 'login' | 'register' | 'forgot') => void
}

const LogoIcon = () => (
  <div style={{
    width: 44, height: 44,
    background: 'rgba(255,255,255,.15)',
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1.5px solid rgba(255,255,255,.25)'
  }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
        stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 16l3-3 3 3" stroke="#fff"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 13v5" stroke="#fff"
        strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  </div>
)

export default function Register({ onNavigate }: Props) {
  const { register }           = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [nom,             setNom]             = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirm,         setConfirm]         = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [error,           setError]           = useState('')
  const [loading,         setLoading]         = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nom || !email || !password || !confirm) {
      setError('Veuillez remplir tous les champs')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    const ok = await register(nom, email, password)
    if (!ok) setError('Cet email est déjà utilisé')
    setLoading(false)
  }

  const EyeIcon = ({ show }: { show: boolean }) => (
    show ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M1 1l22 22" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke="currentColor" strokeWidth="1.6"/>
        <circle cx="12" cy="12" r="3"
          stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    )
  )

  const eyeStyle: React.CSSProperties = {
    position:   'absolute',
    right:      10,
    top:        '50%',
    transform:  'translateY(-50%)',
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    color:      'var(--text3)',
    padding:    4,
    display:    'flex',
    alignItems: 'center'
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>

      {/* ── Panneau gauche ── */}
      <div style={{
        flex:           1,
        background:     '#2563EB',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-between',
        padding:        '40px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoIcon />
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: '#fff', letterSpacing: '-.02em'
            }}>
              SyncFiles
            </div>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,.6)',
              letterSpacing: '.06em', textTransform: 'uppercase'
            }}>
              
            </div>
          </div>
        </div>

        <div>
          <div style={{
            fontSize: 28, fontWeight: 600, color: '#fff',
            lineHeight: 1.2, letterSpacing: '-.03em', marginBottom: 12
          }}>
            Rejoignez<br/>SyncFiles<br/>aujourd'hui.
          </div>
          <div style={{
            fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.6
          }}>
            Créez votre compte et commencez<br/>
            à synchroniser vos fichiers.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#fff', opacity: i === 1 ? .9 : .4
            }}/>
          ))}
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div style={{
        flex:           1,
        background:     'var(--surface)',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'center',
        padding:        '40px 48px',
        position:       'relative',
        overflowY:      'auto'
      }}>

        {/* Toggle dark/light */}
        <button
          onClick={toggleTheme}
          style={{
            position:     'absolute',
            top: 20, right: 20,
            background:   'var(--surface2)',
            border:       '1px solid var(--border2)',
            borderRadius: 8,
            padding:      '6px 12px',
            fontSize:     12, fontWeight: 500,
            color:        'var(--text2)',
            cursor:       'pointer',
            display:      'flex', alignItems: 'center', gap: 6
          }}
        >
          {theme === 'light' ? (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Mode sombre
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M11 3.5L9.5 5M4.5 11L3 12.5"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Mode clair
            </>
          )}
        </button>

        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 24, fontWeight: 600, color: 'var(--text)',
            letterSpacing: '-.03em', marginBottom: 6
          }}>
            Créer un compte
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Remplissez les informations ci-dessous
          </div>
        </div>

        <form onSubmit={handleRegister}>

          {error && (
            <div style={{
              background:   'var(--red-bg)',
              border:       '1px solid var(--red)',
              borderRadius: 8, padding: '10px 14px',
              fontSize:     13, color: 'var(--red-text)',
              marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Nom complet</label>
            <input
              className="form-input"
              type="text"
              placeholder="Votre nom complet"
              value={nom}
              onChange={e => setNom(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input
              className="form-input"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                style={eyeStyle}
                onClick={() => setShowPassword(!showPassword)}
              >
                <EyeIcon show={showPassword} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirmer le mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                style={eyeStyle}
                onClick={() => setShowConfirm(!showConfirm)}
              >
                <EyeIcon show={showConfirm} />
              </button>
            </div>
          </div>

          {/* Indicateur force mot de passe */}
          {password && (
            <div style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', gap: 4, marginBottom: 4
              }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= (
                      password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4 :
                      password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3 :
                      password.length >= 8 ? 2 : 1
                    ) ? (
                      i <= 1 ? '#EF4444' :
                      i <= 2 ? '#F59E0B' :
                      i <= 3 ? '#3B82F6' : '#16A34A'
                    ) : 'var(--border)'
                  }}/>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                {password.length < 8 ? 'Mot de passe trop court' :
                 password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 'Mot de passe très fort' :
                 password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Mot de passe fort' :
                 'Mot de passe acceptable'}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%', justifyContent: 'center',
              height: 40, fontSize: 14, marginTop: 4
            }}
            disabled={loading}
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>

        </form>

        <div style={{
          textAlign: 'center', fontSize: 13,
          color: 'var(--text3)', marginTop: 20
        }}>
          Déjà un compte ?{' '}
          <button
            onClick={() => onNavigate('login')}
            style={{
              background: 'none', border: 'none',
              color:      'var(--accent)', fontWeight: 500,
              cursor:     'pointer', fontFamily: 'var(--font)',
              fontSize:   13
            }}
          >
            Se connecter
          </button>
        </div>

      </div>
    </div>
  )
}