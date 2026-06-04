import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import AvatarUpload from '../components/AvatarUpload'
import { EditIcon, CheckIcon, TrashIcon, UsersIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'

export default function CoachProfile() {
  const { session, profile, updateProfile } = useAuth()

  // ── Name editing ──────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState(profile?.full_name || '')
  const [nameSaving, setNameSaving]   = useState(false)
  const [nameError, setNameError]     = useState('')

  // ── Team & roster ─────────────────────────────────────────────────────────
  const [team, setTeam]               = useState(null)
  const [roster, setRoster]           = useState([])
  const [loading, setLoading]         = useState(true)

  // ── Remove athlete flow ────────────────────────────────────────────────────
  const [confirmRemove, setConfirmRemove] = useState(null) // athlete object
  const [removing, setRemoving]           = useState(null) // athlete id being removed

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teamRes, rosterRes] = await Promise.all([
        api.get('/api/teams/mine'),
        api.get('/api/roster'),
      ])
      setTeam(teamRes.data.team || null)
      setRoster(rosterRes.data.roster || [])
    } catch (err) {
      console.error('[CoachProfile] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Keep nameInput in sync with profile (e.g. after avatar upload refreshes profile)
  useEffect(() => {
    if (!editingName) setNameInput(profile?.full_name || '')
  }, [profile?.full_name, editingName])

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function saveName() {
    if (!nameInput.trim()) return setNameError('Name cannot be empty.')
    setNameError('')
    setNameSaving(true)
    try {
      const res = await api.patch('/api/auth/name', { full_name: nameInput.trim() })
      updateProfile(res.data.profile)
      setEditingName(false)
    } catch (err) {
      setNameError(err.response?.data?.error || 'Failed to update name.')
    } finally {
      setNameSaving(false)
    }
  }

  async function handleRemove(athlete) {
    setRemoving(athlete.id)
    setConfirmRemove(null)
    try {
      await api.delete(`/api/roster/${athlete.id}`)
      setRoster(prev => prev.filter(a => a.id !== athlete.id))
    } catch (err) {
      console.error('[CoachProfile] remove athlete error:', err)
    } finally {
      setRemoving(null)
    }
  }

  const email = session?.user?.email || '—'

  return (
    <div style={styles.page}>
      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div style={styles.headerCard}>
        <AvatarUpload
          name={profile?.full_name}
          avatarUrl={profile?.avatar_url}
          size={88}
          color={ORANGE}
          editable
          onUpload={url => updateProfile({ avatar_url: url })}
        />

        <div style={styles.headerInfo}>
          {/* Name row */}
          {editingName ? (
            <div style={styles.nameEditRow}>
              <input
                autoFocus
                style={styles.nameInput}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                maxLength={100}
              />
              <button style={styles.saveNameBtn} onClick={saveName} disabled={nameSaving}>
                <CheckIcon size={16} color="#fff" />
              </button>
              <button style={styles.cancelNameBtn} onClick={() => { setEditingName(false); setNameInput(profile?.full_name || '') }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={styles.nameRow}>
              <h1 style={styles.name}>{profile?.full_name || '—'}</h1>
              <button style={styles.editNameBtn} onClick={() => setEditingName(true)} title="Edit name">
                <EditIcon size={14} color="var(--text-3)" />
              </button>
            </div>
          )}
          {nameError && <p style={styles.fieldError}>{nameError}</p>}

          <span style={styles.roleBadge}>Coach</span>
        </div>
      </div>

      {/* ── Account details ──────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Account</h2>
        <div style={styles.fieldGrid}>
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Email</span>
            <span style={styles.fieldValue}>{email}</span>
          </div>
          <div style={styles.fieldRow}>
            <span style={styles.fieldLabel}>Team</span>
            <span style={styles.fieldValue}>
              {loading ? '…' : (team?.name || 'No team yet')}
            </span>
          </div>
          {team?.invite_code && (
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Invite code</span>
              <span style={{ ...styles.fieldValue, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                {team.invite_code}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Roster management ────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <div style={styles.rosterHeader}>
          <h2 style={styles.cardTitle}>
            <UsersIcon size={18} color={ORANGE} />
            {' '}Roster
            {roster.length > 0 && (
              <span style={styles.rosterCount}>{roster.length}</span>
            )}
          </h2>
        </div>

        {loading ? (
          <p style={styles.emptyText}>Loading…</p>
        ) : roster.length === 0 ? (
          <p style={styles.emptyText}>No athletes on your roster yet.</p>
        ) : (
          <div style={styles.athleteList}>
            {roster.map(athlete => (
              <div key={athlete.id} style={styles.athleteRow}>
                {/* Avatar initial */}
                <div style={styles.athleteAvatar}>
                  {athlete.avatar_url
                    ? <img src={athlete.avatar_url} alt="" style={styles.avatarImg} />
                    : <span style={styles.avatarInitial}>
                        {(athlete.full_name || '?')[0].toUpperCase()}
                      </span>
                  }
                </div>

                {/* Name + sport/position */}
                <div style={styles.athleteInfo}>
                  <span style={styles.athleteName}>{athlete.full_name || 'Unknown'}</span>
                  {athlete.survey?.sport && (
                    <span style={styles.athleteMeta}>
                      {athlete.survey.sport}
                      {athlete.survey?.position ? ` · ${athlete.survey.position}` : ''}
                    </span>
                  )}
                </div>

                {/* Remove / confirm */}
                {confirmRemove?.id === athlete.id ? (
                  <div style={styles.confirmRow}>
                    <span style={styles.confirmText}>Remove?</span>
                    <button
                      style={styles.confirmYesBtn}
                      onClick={() => handleRemove(athlete)}
                      disabled={removing === athlete.id}
                    >
                      Yes
                    </button>
                    <button style={styles.confirmNoBtn} onClick={() => setConfirmRemove(null)}>
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    style={styles.removeBtn}
                    onClick={() => setConfirmRemove(athlete)}
                    disabled={removing === athlete.id}
                    title="Remove from team"
                  >
                    {removing === athlete.id
                      ? <span style={{ fontSize: 11, color: 'var(--text-3)' }}>…</span>
                      : <TrashIcon size={15} color="#888" />
                    }
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    maxWidth: 560,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  // Header card
  headerCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 20,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderLeft: `3px solid ${ORANGE}`,
    borderRadius: '0 16px 16px 0',
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  headerInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 6,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
    lineHeight: 1.1,
  },
  editNameBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    opacity: 0.7,
  },
  nameEditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  nameInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: 18,
    fontWeight: 700,
    borderRadius: 8,
    border: `2px solid ${ORANGE}`,
    background: 'var(--input-bg)',
    color: 'var(--text)',
    outline: 'none',
    minWidth: 0,
  },
  saveNameBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: ORANGE,
    cursor: 'pointer',
    flexShrink: 0,
  },
  cancelNameBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    color: 'var(--text-2)',
    fontSize: 13,
    cursor: 'pointer',
    flexShrink: 0,
  },
  fieldError: {
    fontSize: 12,
    color: '#c73820',
    margin: 0,
  },
  roleBadge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    background: 'rgba(247,87,9,0.12)',
    padding: '3px 10px',
    borderRadius: 20,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },

  // Account card
  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '20px 24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  fieldGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: 90,
    flexShrink: 0,
  },
  fieldValue: {
    fontSize: 14,
    color: 'var(--text)',
    fontWeight: 500,
  },

  // Roster
  rosterHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rosterCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'rgba(247,87,9,0.12)',
    color: ORANGE,
    fontSize: 11,
    fontWeight: 700,
    marginLeft: 6,
  },
  emptyText: {
    fontSize: 14,
    color: 'var(--text-3)',
    margin: '8px 0 0',
  },
  athleteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    marginTop: 8,
  },
  athleteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 10px',
    borderRadius: 10,
    background: 'transparent',
    transition: 'background 0.12s',
  },
  athleteAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(247,87,9,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: 700,
    color: ORANGE,
  },
  athleteInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  athleteName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  athleteMeta: {
    fontSize: 12,
    color: 'var(--text-3)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  removeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'border-color 0.14s, background 0.14s',
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  confirmText: {
    fontSize: 12,
    color: '#c73820',
    fontWeight: 600,
  },
  confirmYesBtn: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 6,
    border: 'none',
    background: '#c73820',
    color: '#fff',
    cursor: 'pointer',
  },
  confirmNoBtn: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    color: 'var(--text-2)',
    cursor: 'pointer',
  },
}
