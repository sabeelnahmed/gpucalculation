import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useConfig } from '../store/ConfigContext'
import StepProgress from '../components/StepProgress'

// ── Data ──

const deploymentOptions = [
  {
    id: 'onpremise',
    icon: '◉',
    title: 'On-premise',
    desc: 'Hardware in your own data center or server room. Maximum control.',
    pros: ['Full data sovereignty', 'One-time hardware cost + low operating', 'No vendor dependency'],
  },
  {
    id: 'cloud',
    icon: '◎',
    title: 'Cloud GPU rental',
    desc: 'Rent GPU instances from cloud providers. Flexible, fast to start.',
    pros: ['No upfront capital expenditure', 'Scale up or down on demand', 'Managed infrastructure'],
  },
  {
    id: 'hybrid',
    icon: '◈',
    title: 'Hybrid',
    desc: 'On-premise for production, cloud for burst capacity and fine-tuning.',
    pros: ['Best of both approaches', 'Burst to cloud during peaks', 'Keep sensitive data on-premise'],
  },
]

const sensitivityOptions = [
  { id: 'public', dot: '#00D4AA', title: 'Public', desc: 'Non-sensitive data. Marketing content, public documents.' },
  { id: 'internal', dot: '#4A9EFF', title: 'Internal', desc: 'Company documents, employee data, internal communications.' },
  { id: 'confidential', dot: '#E8A84A', title: 'Confidential', desc: 'Financial records, customer PII, trade secrets, IP.' },
  { id: 'regulated', dot: '#E85A5A', title: 'Regulated', desc: 'Banking, healthcare, government, defense. Compliance required.' },
]

const defaultSchedule = {
  chatbot: '24_7', knowledge: '24_7', arabic: '24_7',
  summarization: 'business_hours', code: '24_7',
  compliance: 'business_hours', batch: 'business_hours', custom: '24_7',
}

// ── Selection Card ──

function SelectCard({ icon, title, desc, pros, isSelected, onClick, dot, compact, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="cursor-pointer"
      style={{
        position: 'relative',
        background: isSelected ? '#131315' : '#111113',
        border: isSelected ? '1.5px solid rgba(0,212,170,0.4)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: compact ? '18px' : '24px',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        outline: 'none',
      }}
      whileHover={{
        borderColor: isSelected ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.12)',
        backgroundColor: isSelected ? '#131315' : '#151517',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
        width: '3px', height: isSelected ? '40%' : '0%',
        background: '#00D4AA', borderRadius: '0 2px 2px 0', transition: 'height 0.25s ease',
      }} />

      {/* Subtle glow */}
      {isSelected && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse at top left, rgba(0,212,170,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Dot or Icon */}
      {dot ? (
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dot, marginBottom: '10px' }} />
      ) : icon ? (
        <div style={{
          fontSize: '18px', color: isSelected ? '#00D4AA' : '#8A8A8A',
          fontFamily: 'monospace', transition: 'color 0.2s ease', lineHeight: 1,
        }}>
          {icon}
        </div>
      ) : null}

      {!dot && <div style={{ height: '10px' }} />}

      <div style={{ fontSize: compact ? '14px' : '15px', fontWeight: 500, color: isSelected ? '#E8F0ED' : '#C8C8C8', transition: 'color 0.2s ease' }}>
        {title}
      </div>
      <div style={{ height: '4px' }} />
      <div style={{ fontSize: compact ? '11px' : '12px', color: '#6B6B6B', lineHeight: 1.5 }}>
        {desc}
      </div>

      {/* Pros list */}
      {pros && (
        <div style={{ marginTop: '12px' }}>
          {pros.map((p, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#4A4A4A', lineHeight: 1.7 }}>{p}</div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── Compact Slider ──

function CompactSlider({ value, min, max, onChange, label, suffix = '' }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
      <span style={{ fontSize: '12px', color: '#6B6B6B', minWidth: '130px' }}>{label}</span>
      <div style={{ flex: 1, position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: '4px', borderRadius: '2px', background: '#00D4AA' }} />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', width: '100%', height: '24px',
            opacity: 0, cursor: 'pointer', zIndex: 2,
          }}
        />
        <div style={{
          position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
          width: '16px', height: '16px', borderRadius: '50%', background: '#00D4AA',
          border: '2px solid #0A0A0C', boxShadow: '0 0 0 1px rgba(0,212,170,0.3)',
          pointerEvents: 'none', zIndex: 1,
        }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 500, color: '#E8F0ED', minWidth: '60px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {value}{suffix}
      </span>
    </div>
  )
}

// ── Main Screen ──

export default function DeploymentScreen() {
  const navigate = useNavigate()
  const { config, update } = useConfig()
  const useCase = config.useCase || 'custom'

  const [deployment, setDeployment] = useState(null)
  const [sensitivity, setSensitivity] = useState(null)
  const [schedule, setSchedule] = useState(defaultSchedule[useCase] || '24_7')
  const [hoursPerDay, setHoursPerDay] = useState(12)
  const [workingDays, setWorkingDays] = useState(22)

  const monthlyHours = useMemo(() => {
    if (schedule === '24_7') return 730
    return hoursPerDay * workingDays
  }, [schedule, hoursPerDay, workingDays])

  const showOperatingHours = deployment === 'cloud' || deployment === 'hybrid'
  const canProceed = deployment && sensitivity

  // Conflict warnings
  const conflictNote = useMemo(() => {
    if (!deployment || !sensitivity) return null
    if (sensitivity === 'regulated' && deployment === 'cloud') {
      return { text: '⚠ Regulated data typically requires on-premise deployment to meet compliance requirements. Consider switching to On-premise or Hybrid.', color: '#E8A84A' }
    }
    if (sensitivity === 'confidential' && deployment === 'cloud') {
      return { text: 'Note: Cloud GPU rental keeps your data within your rented infrastructure, but the provider has physical access. For maximum security, consider On-premise.', color: '#8A8A8A' }
    }
    if (sensitivity === 'public' && deployment === 'onpremise') {
      return { text: 'For public data, cloud deployment is often more cost-effective. On-premise still works — you\'ll see the cost comparison in results.', color: '#8A8A8A' }
    }
    return null
  }, [deployment, sensitivity])

  const handleNext = () => {
    const deployData = {
      deployment,
      sensitivity,
      operatingSchedule: schedule,
      hoursPerDay: schedule === 'business_hours' ? hoursPerDay : 24,
      workingDaysPerMonth: schedule === 'business_hours' ? workingDays : 30,
      monthlyOperatingHours: monthlyHours,
    }
    update(deployData)
    navigate('/results')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0C', fontFamily: 'Outfit, sans-serif' }}>
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-28">

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <StepProgress current={5} total={7} />
        </motion.div>
        <div style={{ height: '28px' }} />
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}
          style={{ fontSize: '13px', color: '#6B6B6B', letterSpacing: '1px', textTransform: 'uppercase', margin: 0, fontWeight: 400 }}
        >
          Step 4 of 6
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
          style={{ fontSize: '32px', fontWeight: 400, color: '#E8F0ED', margin: '6px 0 0 0' }}
        >
          Where will this run?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.4 }}
          style={{ fontSize: '15px', color: '#8A8A8A', marginTop: '6px' }}
        >
          Your deployment model and data sensitivity shape the final recommendation.
        </motion.p>

        <div style={{ height: '36px' }} />

        <div style={{ width: '100%', maxWidth: '800px' }}>

          {/* Section 1: Deployment preference */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#4A4A4A', marginBottom: '16px', fontWeight: 500 }}>
              Deployment preference
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {deploymentOptions.map((opt, i) => (
              <SelectCard
                key={opt.id}
                icon={opt.icon}
                title={opt.title}
                desc={opt.desc}
                pros={opt.pros}
                isSelected={deployment === opt.id}
                onClick={() => setDeployment(opt.id)}
                delay={0.35 + i * 0.05}
              />
            ))}
          </div>

          {/* Conflict note */}
          <AnimatePresence>
            {conflictNote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <p style={{ fontSize: '12px', color: conflictNote.color, marginTop: '10px', lineHeight: 1.5 }}>
                  {conflictNote.text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Operating hours */}
          <AnimatePresence>
            {showOperatingHours && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#4A4A4A', marginBottom: '12px', fontWeight: 500 }}>
                    Operating schedule
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { id: '24_7', label: '24/7 always on' },
                      { id: 'business_hours', label: 'Business hours only' },
                    ].map((opt) => {
                      const isActive = schedule === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSchedule(opt.id)}
                          className="cursor-pointer"
                          style={{
                            fontSize: '13px', padding: '8px 20px', borderRadius: '8px',
                            fontFamily: 'Outfit, sans-serif', transition: 'all 0.2s ease',
                            background: isActive ? 'rgba(0,212,170,0.12)' : 'transparent',
                            color: isActive ? '#00D4AA' : '#6B6B6B',
                            border: isActive ? '1px solid rgba(0,212,170,0.25)' : '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>

                  <AnimatePresence>
                    {schedule === 'business_hours' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ marginTop: '12px', padding: '16px 20px', background: '#111113', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <CompactSlider value={hoursPerDay} min={4} max={16} onChange={setHoursPerDay} label="Hours per day" suffix="h" />
                          <CompactSlider value={workingDays} min={15} max={30} onChange={setWorkingDays} label="Working days / month" suffix="d" />
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#8A8A8A', textAlign: 'right' }}>
                            <span style={{ color: '#00D4AA', fontWeight: 500 }}>{monthlyHours}</span> hours/month
                            <span style={{ color: '#4A4A4A' }}> vs 730 for 24/7</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ height: '32px' }} />

          {/* Section 2: Data sensitivity */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#4A4A4A', marginBottom: '16px', fontWeight: 500 }}>
              How sensitive is your data?
            </div>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {sensitivityOptions.map((opt, i) => (
              <SelectCard
                key={opt.id}
                dot={opt.dot}
                title={opt.title}
                desc={opt.desc}
                isSelected={sensitivity === opt.id}
                onClick={() => setSensitivity(opt.id)}
                compact
                delay={0.55 + i * 0.04}
              />
            ))}
          </div>

          {/* Sovereignty insight panel */}
          <AnimatePresence>
            {(sensitivity === 'confidential' || sensitivity === 'regulated') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                {sensitivity === 'confidential' ? (
                  <div style={{
                    marginTop: '16px', padding: '20px 24px', borderRadius: '12px',
                    background: 'rgba(232,168,74,0.04)', border: '1px solid rgba(232,168,74,0.15)',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#E8A84A' }}>
                      Data sovereignty matters for confidential data
                    </div>
                    <div style={{ fontSize: '13px', color: '#8A8A8A', lineHeight: 1.6, marginTop: '8px' }}>
                      Using cloud APIs (GPT-4o, Claude) means your confidential data travels to external servers, potentially crossing international borders. Self-hosted deployment keeps everything inside your compound wall.
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0', marginTop: '16px',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#E85A5A' }}>☁ Cloud API</div>
                        <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '2px' }}>Data leaves your control</div>
                      </div>
                      <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#00D4AA' }}>◉ Self-hosted</div>
                        <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '2px' }}>Data never leaves your premises</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    marginTop: '16px', padding: '20px 24px', borderRadius: '12px',
                    background: 'rgba(232,90,90,0.04)', border: '1px solid rgba(232,90,90,0.15)',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#E85A5A' }}>
                      Regulated data requires on-premise or sovereign cloud
                    </div>
                    <div style={{ fontSize: '13px', color: '#8A8A8A', lineHeight: 1.6, marginTop: '8px' }}>
                      Saudi PDPL mandates that strategically sensitive data be stored within the Kingdom. Banking (SAMA), healthcare, and government data have strict residency requirements. Cloud API providers cannot guarantee compliance.
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                      {['PDPL Compliant', 'SAMA Regulated', 'Data Residency'].map((tag) => (
                        <span key={tag} style={{
                          fontSize: '11px', padding: '4px 10px', borderRadius: '6px',
                          background: 'rgba(232,90,90,0.08)', color: '#E85A5A',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0"
        style={{
          background: 'linear-gradient(transparent 0%, #0A0A0C 50%)',
          padding: '24px 48px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => navigate('/scale')}
          className="cursor-pointer"
          style={{
            fontSize: '14px', color: '#6B6B6B', background: 'none', border: 'none',
            fontFamily: 'Outfit, sans-serif', transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#E8F0ED')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
        >
          ← Back
        </button>

        <motion.button
          onClick={handleNext}
          disabled={!canProceed}
          className="cursor-pointer"
          animate={canProceed ? {
            boxShadow: [
              '0 0 0px rgba(0,212,170,0)',
              '0 0 20px rgba(0,212,170,0.15)',
              '0 0 0px rgba(0,212,170,0)',
            ],
          } : {}}
          transition={canProceed ? {
            boxShadow: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          } : {}}
          style={{
            fontSize: '14px', fontWeight: 500, color: '#0A0A0C', backgroundColor: '#00D4AA',
            padding: '14px 36px', borderRadius: '8px', border: 'none',
            fontFamily: 'Outfit, sans-serif',
            opacity: canProceed ? 1 : 0.3,
            pointerEvents: canProceed ? 'auto' : 'none',
            transition: 'opacity 0.2s ease, background-color 0.2s ease',
          }}
          onMouseEnter={(e) => { if (canProceed) e.currentTarget.style.backgroundColor = '#33DFBE' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#00D4AA' }}
        >
          Next: View results →
        </motion.button>
      </div>
    </div>
  )
}
