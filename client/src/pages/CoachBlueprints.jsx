import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { PlusIcon } from '../components/Icons'

const ORANGE = '#F75709'

export default function CoachBlueprints() {
  const navigate = useNavigate()
  const [blueprints, setBlueprints] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/blueprints')
      .then(r => setBlueprints(r.data.blueprints || []))
      .catch(() => setBlueprints([]))
      .finally(() => setLoading(false))
  }, [])

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
          {blueprints.map(bp => (
            <button
              key={bp.id}
              style={styles.card}
              onClick={() => navigate(`/coach/blueprints/${bp.id}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)' }}
            >
              <span style={styles.cardTitle}>{bp.title}</span>
              {bp.description && (
                <span style={styles.cardDesc}>{bp.description}</span>
              )}
              <div style={styles.cardFooter}>
                <span style={styles.cardMeta}>
                  {bp.num_weeks} {bp.num_weeks === 1 ? 'week' : 'weeks'}
                </span>
                {bp.assignment_count > 0 && (
                  <span style={styles.assignedBadge}>
                    {bp.assignment_count} assigned
                  </span>
                )}
              </div>
            </button>
          ))}
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
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
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
