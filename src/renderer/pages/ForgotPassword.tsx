import React, { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

interface Props {
  onNavigate: (page: 'login' | 'register' | 'forgot') => void
}

export default function ForgotPassword({ onNavigate }: Props) {
  const { theme, toggleTheme } = useTheme()

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Veuillez entrer votre adresse email')
      return
    }

    setLoading(true)
    try {
      const result = await (window as any).electron?.forgotPassword(email)
      if (result?.success) {
        setSent(true)
      } else {
        setError(result?.error || 'Une erreur est survenue')
      }
    } catch {
      setError('Une erreur est survenue')
    }
    setLoading(false)
  }

  return (
    <div style={{
      display:    'flex',
      height:     '100vh',
      background: 'var(--bg)'
    }}>

      {/* ── Panneau gauche ── */}
      <div style={{
        flex:           1,
        background:     '#2563EB',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-between',
        padding:        '40px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'rgba(255,255,255,.2)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 10h14M10 3l7 7-7 7" stroke="#fff" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>SyncFiles</span>
        </div>

        <div>
          <div style={{
            fontSize: 28, fontWeight: 600, color: '#fff',
            lineHeight: 1.2, letterSpacing: '-.03em', marginBottom: 12
          }}>
            Mot de passe<br/>oublié ?<br/>Pas de souci.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.6 }}>
            Entrez votre email et nous vous<br/>
            enverrons un lien de réinitialisation.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#fff', opacity: i === 2 ? .9 : .4
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
        position:       'relative'
      }}>

        {/* Toggle dark/light */}
        <button
          onClick={toggleTheme}
          style={{
            position:     'absolute',
            top:          20,
            right:        20,
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
            gap:          6
          }}
        >
          {theme === 'light' ? (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M11 3.5L9.5 5M4.5 11L3 12.5"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Mode sombre
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Mode clair
            </>
          )}
        </button>

        {/* ── Email envoyé ── */}
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64,
              background: 'var(--green-bg)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14l6 6 10-10" stroke="#16A34A" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{
              fontSize: 20, fontWeight: 600,
              color: 'var(--text)', marginBottom: 8
            }}>
              Email envoyé !
            </div>
            <div style={{
              fontSize: 13, color: 'var(--text3)',
              marginBottom: 32, lineHeight: 1.6
            }}>
              Un lien de réinitialisation a été envoyé à<br/>
              <strong style={{ color: 'var(--text)' }}>{email}</strong><br/>
              Vérifiez votre boîte de réception.<br/>
              Le lien expire dans <strong>30 minutes</strong>.
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', height: 40 }}
              onClick={() => onNavigate('login')}
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                fontSize: 24, fontWeight: 600, color: 'var(--text)',
                letterSpacing: '-.03em', marginBottom: 6
              }}>
                Réinitialiser le mot de passe
              </div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>
                Entrez votre email pour recevoir un lien de réinitialisation
              </div>
            </div>

            <form onSubmit={handleSubmit}>

              {error && (
                <div style={{
                  background:   'var(--red-bg)',
                  border:       '1px solid var(--red)',
                  borderRadius: 8,
                  padding:      '10px 14px',
                  fontSize:     13,
                  color:        'var(--red-text)',
                  marginBottom: 16
                }}>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Adresse email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="Votre@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: '100%', justifyContent: 'center',
                  height: 40, fontSize: 14, marginTop: 8
                }}
                disabled={loading}
              >
                {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
              </button>

            </form>

            <div style={{
              textAlign: 'center', fontSize: 13,
              color: 'var(--text3)', marginTop: 20
            }}>
              <button
                onClick={() => onNavigate('login')}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--accent)', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'var(--font)',
                  fontSize: 13, display: 'inline-flex',
                  alignItems: 'center', gap: 4
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.3"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Retour à la connexion
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}