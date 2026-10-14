import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import SEO from '../components/SEO'
import './FeedbackSurvey.css'

// Public, unauthenticated feedback survey at /feedback. Deliberately
// separate from the authenticated athlete needs-analysis survey at /survey
// (client/src/pages/Survey.jsx) — different purpose, different audience,
// no shared code or route.

const ROLE_OPTIONS      = ['Athlete', 'Coach', 'Parent', 'Trainer', 'Just interested', 'Other']
const LEVEL_OPTIONS     = ['High school', 'College', 'Club', 'Other']
const OFFSEASON_OPTIONS = ['On my own', 'With my team', 'A trainer writes it', "I don't really train", 'Other']
const COACH_OPTIONS     = ['Yes', 'No', 'Not sure']
const HEARD_OPTIONS     = ['Instagram', 'Friend or teammate', 'A coach', 'Other']

const INITIAL_FORM = {
  role: '', roleOther: '',
  sport: '',
  level: '', levelOther: '',
  offseason: '', offseasonOther: '',
  hasCoach: '',
  feedback: '',
  heardAbout: '', heardAboutOther: '',
  email: '',
}

// One radio-button question card, with an optional "Other" text box that
// appears (and becomes required) only when "Other" is selected.
function RadioQuestion({ label, hint, required, name, otherName, options, form, onPick, onOtherChange, error }) {
  const value = form[name]
  const otherValue = otherName ? form[otherName] : ''
  const showOther = otherName && value === 'Other'

  return (
    <div className="survey-q">
      <label className="survey-lab">
        {label} {required && <span className="survey-req">*</span>}
        {hint && <div className="survey-hint">{hint}</div>}
      </label>
      <div className="survey-opts">
        {options.map(opt => (
          <label key={opt} className={`survey-opt${value === opt ? ' survey-sel' : ''}`}>
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onPick(name, opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {otherName && (
        <div className={`survey-other-wrap${showOther ? ' survey-show' : ''}`}>
          <input
            type="text"
            placeholder="Tell us..."
            value={otherValue}
            required={showOther}
            onChange={e => onOtherChange(otherName, e.target.value)}
          />
        </div>
      )}
      {error && <div className="survey-err survey-show">{error}</div>}
    </div>
  )
}

export default function FeedbackSurvey() {
  const [form, setForm]         = useState(INITIAL_FORM)
  const [roleError, setRoleError] = useState('')
  const [otherError, setOtherError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const roleCardRef = useRef(null)

  function pick(name, value) {
    setForm(prev => {
      const next = { ...prev, [name]: value }
      // Clear the paired "other" text whenever a non-"Other" option is chosen,
      // so a stale value can never be submitted.
      const otherField = { role: 'roleOther', level: 'levelOther', offseason: 'offseasonOther', heardAbout: 'heardAboutOther' }[name]
      if (otherField && value !== 'Other') next[otherField] = ''
      return next
    })
    if (name === 'role') setRoleError('')
  }

  function setField(name, value) {
    setForm(prev => ({ ...prev, [name]: value }))
    setOtherError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.role) {
      setRoleError('Pick one to continue.')
      roleCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setRoleError('')

    const otherPairs = [
      ['role', 'roleOther'],
      ['level', 'levelOther'],
      ['offseason', 'offseasonOther'],
      ['heardAbout', 'heardAboutOther'],
    ]
    for (const [field, otherField] of otherPairs) {
      if (form[field] === 'Other' && !form[otherField].trim()) {
        setOtherError('Please fill in the "Other" box above before submitting.')
        return
      }
    }
    setOtherError('')

    setSubmitting(true)
    try {
      await api.post('/api/feedback', form)
      setSubmitted(true)
    } catch (err) {
      setOtherError(err.response?.data?.error || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="survey-page">
      <SEO
        title="Help Shape Offseaz — Feedback Survey"
        description="Two minutes. Tell us what you'd want to see in Offseaz and anything that's confusing. Anyone can fill this out."
        path="/feedback"
      />
      <div className="survey-wrap">
        <div className="survey-head">
          <Link to="/">
            <img src="/offseaz_o_orange.png" alt="Offseaz" />
          </Link>
          <h1>Help shape Offseaz<span className="survey-d">.</span></h1>
          <p>Two minutes. Tell us what you'd want to see and anything that's confusing. Anyone can fill this out.</p>
          <div className="survey-bar" />
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} noValidate>
            <div ref={roleCardRef}>
              <RadioQuestion
                label="Which best describes you?"
                required
                name="role"
                otherName="roleOther"
                options={ROLE_OPTIONS}
                form={form}
                onPick={pick}
                onOtherChange={setField}
                error={roleError}
              />
            </div>

            <div className="survey-q">
              <label className="survey-lab">
                What's your sport?
                <div className="survey-hint">If you play more than one, list them.</div>
              </label>
              <input
                type="text"
                placeholder="e.g. Baseball, Football, Wrestling"
                value={form.sport}
                onChange={e => setField('sport', e.target.value)}
              />
            </div>

            <RadioQuestion
              label="What level?"
              name="level"
              otherName="levelOther"
              options={LEVEL_OPTIONS}
              form={form}
              onPick={pick}
              onOtherChange={setField}
            />

            <RadioQuestion
              label="Right now, how do you train in the offseason?"
              name="offseason"
              otherName="offseasonOther"
              options={OFFSEASON_OPTIONS}
              form={form}
              onPick={pick}
              onOtherChange={setField}
            />

            <RadioQuestion
              label="Does your school or team have a strength coach?"
              name="hasCoach"
              options={COACH_OPTIONS}
              form={form}
              onPick={pick}
              onOtherChange={setField}
            />

            <div className="survey-q">
              <label className="survey-lab">
                What would you want to see in Offseaz? Any questions or confusion?
                <div className="survey-hint">Features, fixes, anything. This is the one we read most.</div>
              </label>
              <textarea
                placeholder="Type whatever you've got..."
                value={form.feedback}
                onChange={e => setField('feedback', e.target.value)}
              />
            </div>

            <RadioQuestion
              label="How did you hear about us?"
              name="heardAbout"
              otherName="heardAboutOther"
              options={HEARD_OPTIONS}
              form={form}
              onPick={pick}
              onOtherChange={setField}
            />

            <div className="survey-q">
              <label className="survey-lab">
                Email <span style={{ fontWeight: 400, color: 'var(--survey-muted)' }}>(optional, only if you want a reply)</span>
              </label>
              <input
                type="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
              />
            </div>

            {otherError && <div className="survey-err survey-show" style={{ marginTop: 14 }}>{otherError}</div>}

            <button type="submit" className="survey-submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
            <div className="survey-foot"><b>offseaz.com</b> &nbsp;&middot;&nbsp; Champions are made in the Offseaz&hellip;</div>
          </form>
        ) : (
          <div className="survey-thanks survey-show">
            <div className="survey-big">Thanks<span className="survey-d">.</span></div>
            <p>Your feedback goes straight to the team. Now go get after it.</p>
            <Link to="/" className="survey-back-link">← Back to offseaz.com</Link>
            <div className="survey-foot" style={{ marginTop: 20 }}><b>offseaz.com</b></div>
          </div>
        )}
      </div>
    </div>
  )
}
