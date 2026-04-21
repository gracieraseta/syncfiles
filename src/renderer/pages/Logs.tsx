import React, { useEffect, useState } from 'react'

export default function Logs() {
  const [events,  setEvents]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('')
  const [action,  setAction]  = useState('TOUS')

  useEffect(() => {
    loadEvents()

    const unsub = (window as any).electron?.onSyncDone(() => {
      loadEvents()
    })

    return () => unsub?.()
  }, [])

  async function loadEvents() {
    try {
      setLoading(true)
      const e = await (window as any).electron?.getRecentEvents(200)
      setEvents(e || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024)        return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / 1024 ** 2).toFixed(1)} Mo`
  }

  function getBadge(action: string) {
    switch (action) {
      case 'ADDED':    return <span className="badge badge-green">Ajouté</span>
      case 'MODIFIED': return <span className="badge badge-blue">Modifié</span>
      case 'DELETED':  return <span className="badge badge-red">Supprimé</span>
      case 'CONFLICT': return <span className="badge badge-amber">Conflit</span>
      default:         return <span className="badge">{action}</span>
    }
  }

  // Filtrage
  const filtered = events.filter(e => {
    const matchFilter = filter === '' ||
      e.nom_fichier.toLowerCase().includes(filter.toLowerCase()) ||
      e.chemin_relatif.toLowerCase().includes(filter.toLowerCase())
    const matchAction = action === 'TOUS' || e.action === action
    return matchFilter && matchAction
  })

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100%'
      }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>Chargement…</span>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Historique & Logs</div>
          <div className="page-subtitle">{events.length} événement(s) enregistré(s)</div>
        </div>
        <button className="btn" onClick={loadEvents}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M13 8A5 5 0 1 1 8 3" stroke="currentColor" strokeWidth="1.3"
              strokeLinecap="round"/>
            <path d="M13 3v5h-5" stroke="currentColor" strokeWidth="1.3"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Actualiser
        </button>
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input
          className="form-input"
          style={{ flex: 2 }}
          placeholder="Rechercher un fichier…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select
          className="form-input"
          style={{ flex: 1 }}
          value={action}
          onChange={e => setAction(e.target.value)}
        >
          <option value="TOUS">Tous les statuts</option>
          <option value="ADDED">Ajoutés</option>
          <option value="MODIFIED">Modifiés</option>
          <option value="DELETED">Supprimés</option>
          <option value="CONFLICT">Conflits</option>
        </select>
      </div>

      {/* ── Tableau ── */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Aucun événement trouvé
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fichier</th>
                <th>Action</th>
                <th>Taille</th>
                <th>Date</th>
                <th>Erreur</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => (
                <tr key={e.id}>
                  <td className="mono">{e.nom_fichier}</td>
                  <td>{getBadge(e.action)}</td>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {formatBytes(e.taille)}
                  </td>
                  <td style={{
                    fontSize: 11, color: 'var(--text3)',
                    fontFamily: 'var(--mono)'
                  }}>
                    {new Date(e.date_evenement).toLocaleString('fr-FR')}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--red-text)' }}>
                    {e.erreur ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}