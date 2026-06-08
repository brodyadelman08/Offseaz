import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PlusIcon, TrashIcon } from '../components/Icons'
import { useCoachAccess } from '../context/CoachAccessContext'

const ORANGE = '#F75709'

export default function CoachBlueprints() {
  const navigate = useNavigate()
  const { team } = useCoachAccess()
  const [blueprints, setBlueprints] = useState([])
  const [loading, setLoading]       = useState(true)

  // Which card is being hovered (id or null)
  const [hoveredId, setHoveredId]   = useState(null)
  // Which blueprint is awaiting delete confirmation (id or null)
  const [confirmId, setConfirmId]   = useState(null)
  const [deleting, setDeleting]     = useState(false)
  const [deleteErr, setDeleteErr]   = useState('')

  useEffect(() => {
    const url = team?.id ? `/api/blueprints?team_id=${team.id}` : '/api/blueprints'
    api.get(url)
      .then(r => setBlueprints(r.data.blueprints || []))
      .catch(() => setBlueprints([]))
      .finally(() => setLoading(false))
  }, [team?.id])

  async function handleDelete(e, blueprintId) {
    e.stopPropagation()
    setDeleting(true)
    setDeleteErr('')
    try {
      await api.delete(`/api/blueprints/${blueprintId}`)
      setBlueprints(prev => prev.filter(b => b.id !== blueprintId))
      setConfirmId(null)
    } catch (err) {
      setDeleteErr(err.response?.data?.error || 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  function cancelDelete(e) {
    e.stopPropagation()
    setConfirmId(null)
    setDeleteErr('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Blueprints</h1>
        <button
          style={styles.createBtn}
          onClick={() => navigate('/coach/blueprints/new')}
        >
          <PlusIcon size={15} color="#fff" />
          Create blueprint
        </button>
      </div>

      {loading ? (
        <p style={styles.empty}>Loading…</p>
      ) : blueprints.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>No blueprints yet</p>
          <p style={styles.emptyDesc}>
            Create a training blueprint to assign structured plans to your athletes.
          </p>
          <button
            style={styles.emptyCreateBtn}
            onClick={() => navigate('/coach/blueprints/new')}
          >
            Create your first blueprint
          </button>
        </div>
      ) : (
        <div style={styles.grid}>
          {blueprints.map(bp => {
            const isHovered = hoveredId === bp.id
            const isConfirming = confirmId === bp.id

            return (
              <div
                key={bp.id}
                style={{
                  ...styles.card,
                  ...(isHovered && !isConfirming ? {
                    borderColor: ORANGE,
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)',
                  } : {}),
                  ...(isConfirming ? {
                    borderColor: 'rgba(199,56,32,0.50)',
                    boxShadow: '0 4px 20px rgba(199,56,32,0.16), inset 0 1px 0 rgba(255,255,255,0.04)',
                  } : {}),
                  cursor: isConfirming ? 'default' : 'pointer',
                  position: 'relative',
                }}
                onClick={() => !isConfirming && navigate(`/coach/blueprints/${bp.id}`)}
                onMouseEnter={() => setHoveredId(bp.id)}
                onMouseLeave={() => { setHoveredId(null); if (!isConfirming) setDeleteErr('') }}
              >
                {/* ── Trash icon — appears on hover, top-right corner ── */}
                {!isConfirming && (
                  <button
                    className="bp-trash-btn"
                    style={{
                      ...styles.trashBtn,
                      opacity: isHovered ? 1 : 0,
                      pointerEvents: isHovered ? 'auto' : 'none',
                    }}
                    onClick={e => { e.stopPropagation(); setConfirmId(bp.id); setDeleteErr('') }}
                    title="Delete blueprint"
                  >
                    <TrashIcon size={14} color="var(--text-3)" />
                  </button>
                )}

                {/* ── Inline delete confirmation overlay ── */}
                {isConfirming && (
                  <div style={styles.confirmOverlay} onClick={e => e.stopPropagation()}>
                    <p style={styles.confirmMsg}>
                      Delete <strong style={{ color: 'var(--text)' }}>"{bp.title}"</strong>?
                      <br />
                      <span style={styles.confirmSub}>This cannot be undone.</span>
                    </p>
                    {deleteErr && <p style={styles.deleteErr}>{deleteErr}</p>}
                    <div style={styles.confirmBtns}>
                      <button
                        style={styles.cancelBtn}
                        onClick={cancelDelete}
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                      <button
                        style={{ ...styles.deleteBtn, opacity: deleting ? 0.6 : 1 }}
                        onClick={e => handleDelete(e, bp.id)}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Card content (faded during confirm) ── */}
                <span style={{ ...styles.cardTitle, opacity: isConfirming ? 0.25 : 1 }}>
                  {bp.title}
                </span>
                {bp.description && (
                  <span style={{ ...styles.cardDesc, opacity: isConfirming ? 0.25 : 1 }}>
                    {bp.description}
                  </span>
                )}
                <div style={{ ...styles.cardFooter, opacity: isConfirming ? 0.25 : 1 }}>
                  <span style={styles.cardMeta}>
                    {bp.num_weeks} {bp.num_weeks === 1 ? 'week' : 'weeks'}
                  </span>
                  {bp.assignment_count > 0 && (
                    <span style={styles.assignedBadge}>
                      {bp.assignment_count} assigned
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { maxWidth: 900, margin: '0 auto' },

  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 16,
  },
  pageTitle: { fontSize: 26, fontWeight: 700, color: 'var(--text)', margin: 0 },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '9px 18px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    letterSpacing: 0.1,
    boxShadow: '0 2px 10px rgba(247,87,9,0.32)',
  },

  empty: { color: 'var(--text-3)', fontSize: 15 },
  emptyState: { textAlign: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'var(--text-2)', marginBottom: 24 },
  emptyCreateBtn: {
    padding: '11px 24px',
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 10,
    border: 'none',
    background: ORANGE,
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(247,87,9,0.32)',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
    gap: 14,
  },

  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '20px 18px',
    borderRadius: 16,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    textAlign: 'left',
    transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
    userSelect: 'none',
  },

  // Trash icon button — absolutely positioned top-right of the card
  trashBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--card-inner)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
    zIndex: 2,
    '&:hover': { background: 'rgba(199,56,32,0.10)', borderColor: 'rgba(199,56,32,0.35)' },
  },

  // Inline confirmation overlay sits on top of the card content
  confirmOverlay: {
    position: 'absolute',
    inset: 0,
    borderRadius: 16,
    background: 'rgba(10,10,10,0.88)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '16px 18px',
    zIndex: 3,
  },
  confirmMsg: {
    fontSize: 13,
    color: 'var(--text-2)',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.5,
  },
  confirmSub: {
    fontSize: 11,
    color: 'var(--text-3)',
  },
  confirmBtns: {
    display: 'flex',
    gap: 8,
  },
  cancelBtn: {
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-2)',
    cursor: 'pointer',
    transition: 'border-color 0.14s',
  },
  deleteBtn: {
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 8,
    border: 'none',
    background: '#c73820',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(199,56,32,0.38)',
    transition: 'opacity 0.14s',
  },
  deleteErr: {
    fontSize: 11,
    color: '#ff8070',
    margin: '-4px 0 0',
    textAlign: 'center',
  },

  cardTitle: { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  cardDesc: {
    fontSize: 13,
    color: 'var(--text-2)',
    lineHeight: 1.5,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardMeta: { fontSize: 12, color: 'var(--text-3)' },
  assignedBadge: {
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(247,87,9,0.1)',
    color: ORANGE,
    padding: '3px 9px',
    borderRadius: 6,
  },
}
