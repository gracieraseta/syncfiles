import React, { useEffect, useState } from 'react'

export default function Profiles() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({
    nom:         '',
    sens:        'A_TO_B',
    mode:        'MANUAL',
    cron_expr:   '0 2 * * *',
    src_chemin:  '',
    dst_chemin:  '',
    exclure:     '*.tmp, .DS_Store, node_modules/'
  })

  useEffect(() => {
    loadProfiles()

    const unsubDone = (window as any).electron?.onSyncDone(() => {
      setSyncing(null)
      loadProfiles()
    })
    const unsubError = (window as any).electron?.onSyncError(() => {
      setSyncing(null)
    })

    return () => { unsubDone?.(); unsubError?.() }
  }, [])

  async function loadProfiles() {
    try {
      setLoading(true)
      const p = await (window as any).electron?.getProfiles()
      setProfiles(p || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartSync(profileId: number) {
    try {
      await (window as any).electron?.startSync(profileId)
      setSyncing(profileId)
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDryRun(profileId: number) {
    try {
      const result = await (window as any).electron?.dryRun(profileId)
      alert(
        `Simulation :\n` +
        `Ajouter : ${result.toAdd.length}\n` +
        `Modifier : ${result.toUpdate.length}\n` +
        `Supprimer : ${result.toDelete.length}\n` +
        `Conflits : ${result.conflicts.length}`
      )
    } catch (err) {
      console.error(err)
    }
  }

  async function handleCreateProfile() {
    if (!form.nom || !form.src_chemin || !form.dst_chemin) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }
    try {
      await (window as any).electron?.createProfile({
        nom:       form.nom,
        sens:      form.sens,
        mode:      form.mode,
        cron_expr: form.mode === 'SCHEDULED' ? form.cron_expr : null,
        filtres: {
          exclure:       form.exclure.split(',').map(s => s.trim()).filter(Boolean),
          inclure:       [],
          taille_max_mo: null
        },
        user_id:     1,
        source:      { type: 'LOCAL', chemin: form.src_chemin },
        destination: { type: 'LOCAL', chemin: form.dst_chemin }
      })
      setShowForm(false)
      setForm({
        nom: '', sens: 'A_TO_B', mode: 'MANUAL',
        cron_expr: '0 2 * * *', src_chemin: '',
        dst_chemin: '', exclure: '*.tmp, .DS_Store, node_modules/'
      })
      await loadProfiles()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>Chargement…</span>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">Mes profils</div>
          <div className="page-subtitle">{profiles.length} profil(s) configuré(s)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {showForm ? 'Annuler' : 'Nouveau profil'}
        </button>
      </div>

      {/* ── Formulaire création ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Nouveau profil de synchronisation</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="form-group">
                <label className="form-label">Nom du profil *</label>
                <input
                  className="form-input"
                  placeholder="Ex: Projet → NAS"
                  value={form.nom}
                  onChange={e => setForm({ ...form, nom: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dossier source *</label>
                <input
                  className="form-input"
                  placeholder="C:\Users\RASETA\Documents"
                  value={form.src_chemin}
                  onChange={e => setForm({ ...form, src_chemin: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dossier destination *</label>
                <input
                  className="form-input"
                  placeholder="C:\synctest\destination"
                  value={form.dst_chemin}
                  onChange={e => setForm({ ...form, dst_chemin: e.target.value })}
                />
              </div>
            </div>
            <div>
              <div className="form-group">
                <label className="form-label">Sens</label>
                <select
                  className="form-input"
                  value={form.sens}
                  onChange={e => setForm({ ...form, sens: e.target.value })}
                >
                  <option value="A_TO_B">A → B (source vers destination)</option>
                  <option value="B_TO_A">B → A (destination vers source)</option>
                  <option value="BIDIRECTIONAL">A ↔ B (bidirectionnel)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mode</label>
                <select
                  className="form-input"
                  value={form.mode}
                  onChange={e => setForm({ ...form, mode: e.target.value })}
                >
                  <option value="MANUAL">Manuel</option>
                  <option value="SCHEDULED">Planifié</option>
                  <option value="REALTIME">Temps réel</option>
                </select>
              </div>
              {form.mode === 'SCHEDULED' && (
                <div className="form-group">
                  <label className="form-label">Expression cron</label>
                  <input
                    className="form-input"
                    placeholder="0 2 * * *"
                    value={form.cron_expr}
                    onChange={e => setForm({ ...form, cron_expr: e.target.value })}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Exclusions</label>
                <input
                  className="form-input"
                  placeholder="*.tmp, .DS_Store, node_modules/"
                  value={form.exclure}
                  onChange={e => setForm({ ...form, exclure: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setShowForm(false)}>
                  Annuler
                </button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleCreateProfile}>
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Liste des profils ── */}
      {profiles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            Aucun profil — cliquez sur "Nouveau profil" pour commencer
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profiles.map((p: any) => (
            <div key={p.id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'var(--accent-bg)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10h14M10 3l7 7-7 7" stroke="#2563EB" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {p.nom}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {p.sens === 'A_TO_B' ? 'A → B' :
                   p.sens === 'B_TO_A' ? 'B → A' : 'A ↔ B'} ·{' '}
                  {p.mode === 'MANUAL' ? 'Manuel' :
                   p.mode === 'SCHEDULED' ? `Planifié (${p.cron_expr})` : 'Temps réel'} ·{' '}
                  {p.source?.chemin ?? ''}
                </div>
              </div>
              <span className={`badge ${
                p.statut === 'ACTIVE'   ? 'badge-green' :
                p.statut === 'PAUSED'   ? 'badge-amber' : 'badge-red'
              }`}>
                {p.statut === 'ACTIVE' ? 'Actif' :
                 p.statut === 'PAUSED' ? 'Pausé' : 'Inactif'}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn"
                  style={{ height: 28, fontSize: 11, padding: '0 10px' }}
                  onClick={() => handleDryRun(p.id)}
                >
                  Simuler
                </button>
                <button
                  className="btn btn-primary"
                  style={{ height: 28, fontSize: 11, padding: '0 10px' }}
                  onClick={() => handleStartSync(p.id)}
                  disabled={syncing === p.id}
                >
                  {syncing === p.id ? 'En cours…' : 'Lancer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}