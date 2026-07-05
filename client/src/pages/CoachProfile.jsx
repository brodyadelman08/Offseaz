import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useCoachAccess } from '../context/CoachAccessContext'
import AvatarUpload from '../components/AvatarUpload'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { EditIcon, CheckIcon, TrashIcon, UsersIcon } from '../components/Icons'

const ORANGE = '#F75709'
const BLUE   = '#308EBD'
const RED    = '#DC2626'

export default function CoachProfile() {
  const { session, profile, updateProfile, signOut } = useAuth()
  const coachCtx = useCoachAccess()
  const accessLevel = coachCtx?.accessLevel ?? null

  // ── Name editing ──────────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState(profile?.full_name || '')
  const [nameSaving, setNameSaving]   = useState(false)
  const [nameError, setNameError]     = useState('')

  // ── Team & roster ─────────────────────────────────────────────────────────
  const [team, setTeam]               = useState(null)
  const [roster, setRoster]           = useState([])
  const [loading, setLoading]         = useState(true)

  // ── Digest email preference ───────────────────────────────────────────────
  const [digestEnabled, setDigestEnabled] = useState(profile?.digest_enabled !== false)
  const [digestSaving,  setDigestSaving]  = useState(false)

  // ── Remove athlete flow ────────────────────────────────────────────────────
  const [confirmRemove, setConfirmRemove] = useState(null) // athlete object
  const [removing, setRemoving]           = useState(null) // athlete id being removed

  // ── Transfer ownership / leave team ─────────────────────────────────────────
  const [coachList, setCoachList]         = useState([])
  const [showLeave, setShowLeave]         = useState(false)
  const [selectedNewOwner, setSelectedNewOwner] = useState(null)
  const [transferring, setTransferring]   = useState(false)
  const [transferDone, setTransferDone]   = useState(false)
  const [transferErr, setTransferErr]     = useState('')

  // ── Delete account / delete team ────────────────────────────────────────────
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletingAccount,   setDeletingAccount]   = useState(false)
  const [deleteAccountErr,  setDeleteAccountErr]  = useState('')
  const [showDeleteTeam,    setShowDeleteTeam]    = useState(false)
  const [deletingTeam,      setDeletingTeam]      = useState(false)
  const [deleteTeamErr,     setDeleteTeamErr]     = useState('')

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [teamRes, rosterRes, coachRes] = await Promise.all([
        api.get('/api/teams/mine'),
        api.get('/api/roster'),
        api.get('/api/teams/coaches').catch(() => ({ data: { coaches: [] } })),
      ])
      setTeam(teamRes.data.team || null)
      setRoster(rosterRes.data.roster || [])
      setCoachList(coachRes.data.coaches || [])
    } catch (err) {
      console.error('[CoachProfile] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Keep digestEnabled in sync if profile reloads
  useEffect(() => {
    setDigestEnabled(profile?.digest_enabled !== false)
  }, [profile?.digest_enabled])

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

  async function toggleDigest(val) {
    setDigestEnabled(val)
    setDigestSaving(true)
    try {
      const res = await api.patch('/api/auth/digest-preference', { digest_enabled: val })
      updateProfile(res.data.profile)
    } catch (err) {
      setDigestEnabled(!val) // revert on failure
      console.error('[CoachProfile] digest toggle error:', err)
    } finally {
      setDigestSaving(false)
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

  async function handleTransferOwnership() {
    if (!selectedNewOwner) return
    setTransferErr('')
    setTransferring(true)
    try {
      await api.post('/api/teams/transfer-ownership', { new_head_coach_id: selectedNewOwner })
      setTransferDone(true)
      // Refresh access level by reloading the page (context will update on next mount)
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setTransferErr(err.response?.data?.error || 'Transfer failed.')
    } finally {
      setTransferring(false)
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    setDeleteAccountErr('')
    try {
      await api.delete('/api/auth/account')
      await signOut()
      window.location.href = '/'
    } catch (err) {
      setDeleteAccountErr(err.response?.data?.error || 'Failed to delete account.')
      setDeletingAccount(false)
    }
  }

  async function handleDeleteTeam() {
    if (!team) return
    setDeletingTeam(true)
    setDeleteTeamErr('')
    try {
      await api.delete(`/api/teams/${team.id}`)
      window.location.reload()
    } catch (err) {
      setDeleteTeamErr(err.response?.data?.error || 'Failed to delete team.')
      setDeletingTeam(false)
    }
  }

  const isHeadCoach = accessLevel === 'head_coach'
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

      {/* ── Notifications ────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Notifications</h2>
        <div style={styles.toggleRow}>
          <div style={styles.toggleInfo}>
            <span style={styles.toggleLabel}>Weekly Digest Email</span>
            <span style={styles.toggleDesc}>
              Receive a summary of your team&apos;s activity every Monday morning.
            </span>
          </div>
          <button
            style={{
              ...styles.toggleBtn,
              background: digestEnabled ? ORANGE : 'var(--border)',
              opacity: digestSaving ? 0.6 : 1,
            }}
            onClick={() => toggleDigest(!digestEnabled)}
            disabled={digestSaving}
            aria-pressed={digestEnabled}
            aria-label="Toggle weekly digest email"
          >
            <span style={{
              ...styles.toggleThumb,
              transform: digestEnabled ? 'translateX(20px)' : 'translateX(0)',
            }} />
          </button>
        </div>
      </div>

      {/* ── Leave Team / Transfer Ownership ──────────────────────────── */}
      {team && (
        <div style={{ ...styles.card, borderColor: 'rgba(199,56,32,0.22)' }}>
          <h2 style={{ ...styles.cardTitle, color: '#c73820' }}>Leave Team</h2>

          {!showLeave ? (
            <button
              style={styles.leaveBtn}
              onClick={() => setShowLeave(true)}
            >
              Leave {team.name}
            </button>
          ) : transferDone ? (
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              ✓ Ownership transferred. Reloading…
            </p>
          ) : isHeadCoach ? (
            // Head coach must transfer ownership first
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55 }}>
                Before you leave, you must transfer ownership to another coach on this team.
              </p>
              {coachList.length === 0 ? (
                <div style={styles.transferNote}>
                  <strong style={{ color: 'var(--text)' }}>You are the only coach on this team.</strong>
                  {' '}Add an assistant coach before leaving, or delete the team entirely.
                </div>
              ) : (
                <>
                  <div style={styles.coachPicker}>
                    {coachList.map(c => (
                      <button
                        key={c.id}
                        style={{
                          ...styles.coachOption,
                          borderColor: selectedNewOwner === c.id ? '#c73820' : 'var(--border)',
                          background:  selectedNewOwner === c.id ? 'rgba(199,56,32,0.07)' : 'transparent',
                        }}
                        onClick={() => setSelectedNewOwner(c.id)}
                      >
                        <span style={styles.coachOptionName}>{c.full_name}</span>
                        <span style={styles.coachOptionLevel}>{c.access_level === 'admin_coach' ? 'Admin Coach' : 'View Only'}</span>
                      </button>
                    ))}
                  </div>
                  {transferErr && <p style={styles.transferErr}>{transferErr}</p>}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={styles.cancelLeaveBtn} onClick={() => { setShowLeave(false); setSelectedNewOwner(null); setTransferErr('') }}>
                      Cancel
                    </button>
                    <button
                      style={{ ...styles.confirmTransferBtn, opacity: !selectedNewOwner || transferring ? 0.5 : 1 }}
                      onClick={handleTransferOwnership}
                      disabled={!selectedNewOwner || transferring}
                    >
                      {transferring ? 'Transferring…' : 'Transfer & Leave'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            // Assistant coach — can just leave
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
                You will be removed from {team.name} and lose access to its roster and blueprints.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={styles.cancelLeaveBtn} onClick={() => setShowLeave(false)}>Cancel</button>
                <button style={styles.confirmTransferBtn} onClick={async () => { await signOut(); window.location.href = '/login' }}>
                  Leave Team
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Delete Team (head coach only) ──────────────────────────────── */}
      {team && isHeadCoach && (
        <div style={{ ...styles.card, borderColor: 'rgba(220,38,38,0.30)' }}>
          <h2 style={{ ...styles.cardTitle, color: RED }}>Delete Team</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
            Permanently deletes {team.name} — all athletes will be removed from the team and all
            team data (blueprints, messages, digest history) will be deleted. This does not delete
            your coach account.
          </p>
          <button style={styles.deleteTeamBtn} onClick={() => setShowDeleteTeam(true)}>
            Delete {team.name}
          </button>
        </div>
      )}

      {/* ── Danger zone: delete account ─────────────────────────────────── */}
      <div style={{ ...styles.card, borderColor: 'rgba(220,38,38,0.30)' }}>
        <h2 style={{ ...styles.cardTitle, color: RED }}>Danger Zone</h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55, margin: '0 0 14px' }}>
          Permanently delete your account and all your teams, blueprints, and athlete data
          associated with your teams.
        </p>
        <button style={styles.deleteTeamBtn} onClick={() => setShowDeleteAccount(true)}>
          Delete My Account
        </button>
      </div>

      {showDeleteTeam && (
        <ConfirmDeleteModal
          title={`Delete ${team?.name}?`}
          warningText="All athletes will be removed from this team and all team data — blueprints, messages, and digest history — will be permanently deleted. This cannot be undone."
          confirmLabel="Delete Team"
          loading={deletingTeam}
          error={deleteTeamErr}
          onConfirm={handleDeleteTeam}
          onCancel={() => { setShowDeleteTeam(false); setDeleteTeamErr('') }}
        />
      )}

      {showDeleteAccount && (
        <ConfirmDeleteModal
          title="Delete Your Account?"
          warningText="This will permanently delete your account and all your teams, blueprints, and athlete data associated with your teams. This cannot be undone."
          confirmLabel="Delete My Account"
          loading={deletingAccount}
          error={deleteAccountErr}
          onConfirm={handleDeleteAccount}
          onCancel={() => { setShowDeleteAccount(false); setDeleteAccountErr('') }}
        />
      )}
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
    gap: 16,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderLeft: `3px solid ${ORANGE}`,
    borderRadius: '0 16px 16px 0',
    padding: 'clamp(16px, 4vw, 24px)',
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
    width: 36,
    height: 36,
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
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 6,
    border: 'none',
    background: '#c73820',
    color: '#fff',
    cursor: 'pointer',
    minHeight: 36,
  },
  confirmNoBtn: {
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    color: 'var(--text-2)',
    cursor: 'pointer',
    minHeight: 36,
  },

  // Notifications toggle
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  toggleInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text)',
  },
  toggleDesc: {
    fontSize: 12,
    color: 'var(--text-3)',
    lineHeight: 1.5,
  },
  toggleBtn: {
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s, opacity 0.15s',
    padding: 0,
  },
  toggleThumb: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s',
    display: 'block',
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
  },

  // Leave / transfer ownership
  leaveBtn: {
    alignSelf: 'flex-start',
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: '1px solid rgba(199,56,32,0.40)',
    background: 'rgba(199,56,32,0.06)',
    color: '#c73820',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  deleteTeamBtn: {
    alignSelf: 'flex-start',
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: '1px solid rgba(220,38,38,0.40)',
    background: 'rgba(220,38,38,0.06)',
    color: '#DC2626',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  transferNote: {
    fontSize: 13,
    color: 'var(--text-2)',
    background: 'rgba(199,56,32,0.06)',
    border: '1px solid rgba(199,56,32,0.20)',
    borderRadius: 10,
    padding: '12px 16px',
    lineHeight: 1.6,
  },
  coachPicker: { display: 'flex', flexDirection: 'column', gap: 8 },
  coachOption: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px',
    borderRadius: 10, border: '1px solid',
    background: 'transparent', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    textAlign: 'left',
  },
  coachOptionName:  { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  coachOptionLevel: { fontSize: 11, color: 'var(--text-3)', fontWeight: 500 },
  transferErr: { fontSize: 12, color: '#c73820', margin: 0 },
  cancelLeaveBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-2)',
    cursor: 'pointer',
  },
  confirmTransferBtn: {
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: '#c73820',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(199,56,32,0.35)',
    transition: 'opacity 0.14s',
  },
}
