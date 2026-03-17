import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useConfig } from '../store/ConfigContext'
import StepProgress from '../components/StepProgress'

// ── Constants ──

const useCaseDefaults = {
  chatbot: { users: 50, requests: 30 },
  knowledge: { users: 25, requests: 20 },
  summarization: { users: 10, requests: 15 },
  code: { users: 20, requests: 40 },
  compliance: { users: 10, requests: 10 },
  arabic: { users: 50, requests: 25 },
  batch: { users: 5, requests: 200 },
  custom: { users: 10, requests: 25 },
}

const tokenAverages = {
  chatbot: { input: 1500, output: 400 },
  knowledge: { input: 2000, output: 500 },
  summarization: { input: 3000, output: 500 },
  code: { input: 2000, output: 800 },
  compliance: { input: 5000, output: 1000 },
  arabic: { input: 1500, output: 400 },
  batch: { input: 2000, output: 300 },
  custom: { input: 2000, output: 500 },
}

const userPresets = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 5000, 10000]
const userTicks = [1, 10, 50, 100, 500, 1000, 5000, 10000]
const requestPresets = [5, 10, 25, 50, 100, 200, 500]
const requestTicks = [1, 10, 50, 100, 200, 500]

// ── Logarithmic mapping ──

function valueToLog(value) {
  // Maps 1–10000 to 0–1 logarithmically
  return Math.log(value) / Math.log(10000)
}

function logToValue(pos) {
  // Maps 0–1 to 1–10000 logarithmically
  return Math.round(Math.max(1, Math.min(10000, Math.exp(pos * Math.log(10000)))))
}

// ── Formatting ──

function formatTokens(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return n.toString()
}

function formatCost(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K/mo`
  return `$${Math.round(n)}/mo`
}

function formatGB(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(2)} TB`
  if (n < 0.01) return `${(n * 1024).toFixed(1)} MB`
  return `${n.toFixed(1)} GB`
}

// ── Animated Number ──

function AnimatedNumber({ value, format = (v) => v, color = '#00D4AA', size = '48px', weight = 600 }) {
  const spring = useSpring(value, { stiffness: 120, damping: 20, mass: 0.5 })
  const display = useTransform(spring, (v) => format(Math.round(v)))
  const [text, setText] = useState(format(value))

  useEffect(() => { spring.set(value) }, [value, spring])
  useEffect(() => {
    const unsub = display.on('change', (v) => setText(v))
    return unsub
  }, [display])

  return (
    <span style={{
      fontSize: size,
      fontWeight: weight,
      color,
      fontVariantNumeric: 'tabular-nums',
      fontFamily: 'Outfit, sans-serif',
      lineHeight: 1,
    }}>
      {text}
    </span>
  )
}

// ── Custom Slider ──

function CustomSlider({ value, min, max, onChange, logarithmic = false, ticks = [], presets = [] }) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)

  const getPosition = useCallback((val) => {
    if (logarithmic) return valueToLog(val) * 100
    return ((val - min) / (max - min)) * 100
  }, [logarithmic, min, max])

  const positionToValue = useCallback((pct) => {
    if (logarithmic) return logToValue(pct / 100)
    return Math.round(min + (pct / 100) * (max - min))
  }, [logarithmic, min, max])

  const handlePointer = useCallback((e) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    onChange(positionToValue(pct))
  }, [positionToValue, onChange])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => handlePointer(e)
    const onUp = () => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, handlePointer])

  const pos = getPosition(value)
  const thumbSize = hovering || dragging ? 26 : 22

  return (
    <div>
      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={(e) => { setDragging(true); handlePointer(e) }}
        style={{
          position: 'relative',
          height: '32px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          touchAction: 'none',
        }}
      >
        {/* Background track */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          height: '6px',
          borderRadius: '3px',
          background: 'rgba(255,255,255,0.06)',
        }} />
        {/* Filled track */}
        <div style={{
          position: 'absolute',
          left: 0,
          width: `${pos}%`,
          height: '6px',
          borderRadius: '3px',
          background: '#00D4AA',
        }} />
        {/* Thumb */}
        <div
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            position: 'absolute',
            left: `${pos}%`,
            transform: 'translateX(-50%)',
            width: `${thumbSize}px`,
            height: `${thumbSize}px`,
            borderRadius: '50%',
            background: '#00D4AA',
            border: '3px solid #0A0A0C',
            boxShadow: dragging
              ? '0 0 12px rgba(0,212,170,0.4), 0 0 0 2px rgba(0,212,170,0.3)'
              : '0 0 0 2px rgba(0,212,170,0.3)',
            transition: 'width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease',
            zIndex: 2,
          }}
        />
      </div>

      {/* Tick labels */}
      <div style={{ position: 'relative', height: '20px', marginTop: '4px' }}>
        {ticks.map((t) => (
          <span
            key={t}
            style={{
              position: 'absolute',
              left: `${getPosition(t)}%`,
              transform: 'translateX(-50%)',
              fontSize: '10px',
              color: '#4A4A4A',
            }}
          >
            {t.toLocaleString()}
          </span>
        ))}
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        {presets.map((p) => {
          const isActive = value === p
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                transition: 'all 0.2s ease',
                background: isActive ? 'rgba(0,212,170,0.12)' : 'transparent',
                color: isActive ? '#00D4AA' : '#6B6B6B',
                border: isActive ? '1px solid rgba(0,212,170,0.25)' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {p.toLocaleString()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Editable Number ──

function EditableNumber({ value, onChange, min, max, color = '#00D4AA', size = '48px' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef(null)

  useEffect(() => { setDraft(String(value)) }, [value])
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const commit = () => {
    setEditing(false)
    const n = Math.max(min, Math.min(max, Math.round(Number(draft) || min)))
    onChange(n)
    setDraft(String(n))
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        style={{
          fontSize: size,
          fontWeight: 600,
          color,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'Outfit, sans-serif',
          background: 'transparent',
          border: 'none',
          borderBottom: `2px solid ${color}`,
          outline: 'none',
          width: `${Math.max(3, String(value).length + 1)}ch`,
          textAlign: 'right',
          lineHeight: 1,
        }}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: 'text' }}
      title="Click to edit"
    >
      <AnimatedNumber value={value} format={(v) => v.toLocaleString()} color={color} size={size} />
    </span>
  )
}

// ── Main Screen ──

export default function ScaleScreen() {
  const navigate = useNavigate()
  const { config, update } = useConfig()
  const useCase = config.useCase || 'custom'
  const model = config.model || {}

  const defaults = useCaseDefaults[useCase] || useCaseDefaults.custom
  const [users, setUsers] = useState(defaults.users)
  const [requests, setRequests] = useState(defaults.requests)

  const tokens = tokenAverages[useCase] || tokenAverages.custom

  // Live calculations
  const calc = useMemo(() => {
    const dailyInput = users * requests * tokens.input
    const dailyOutput = users * requests * tokens.output
    const dailyTotal = dailyInput + dailyOutput
    const monthlyInput = dailyInput * 30
    const monthlyOutput = dailyOutput * 30
    const monthlyTotal = dailyTotal * 30
    const apiCost = (monthlyInput / 1e6 * 2.50) + (monthlyOutput / 1e6 * 10.00)

    // KV cache calculation
    const numLayers = model.num_layers || 32
    const numKvHeads = model.num_kv_heads || 8
    const headDim = model.head_dim || 128
    const ctxLen = config.contextLength || 4096
    const kvPerTokenBytes = 2 * numLayers * numKvHeads * headDim * 2
    const kvPerUserGB = (kvPerTokenBytes * ctxLen) / (1024 ** 3)
    const kvTotalGB = kvPerUserGB * users

    return { dailyTotal, monthlyTotal, monthlyInput, monthlyOutput, apiCost, kvTotalGB }
  }, [users, requests, tokens, model, config.contextLength])

  const handleNext = () => {
    const scaleData = {
      concurrentUsers: users,
      requestsPerDay: requests,
      dailyTokens: calc.dailyTotal,
      monthlyTokens: calc.monthlyTotal,
      estimatedAPICost: calc.apiCost,
      kvCacheTotal: calc.kvTotalGB,
    }
    update(scaleData)
    navigate('/deployment')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0C', fontFamily: 'Outfit, sans-serif' }}>
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-28">

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <StepProgress current={4} total={7} />
        </motion.div>
        <div style={{ height: '28px' }} />
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{ fontSize: '13px', color: '#6B6B6B', letterSpacing: '1px', textTransform: 'uppercase', margin: 0, fontWeight: 400 }}
        >
          Step 3 of 6
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
          style={{ fontSize: '32px', fontWeight: 400, color: '#E8F0ED', margin: '6px 0 0 0' }}
        >
          How big is your deployment?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{ fontSize: '15px', color: '#8A8A8A', marginTop: '6px' }}
        >
          These numbers directly determine your hardware needs and cost.
        </motion.p>

        <div style={{ height: '36px' }} />

        <div style={{ width: '100%', maxWidth: '680px' }}>

          {/* Input 1: Concurrent Users */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
            style={{
              background: '#111113',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px',
              padding: '32px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#E8F0ED' }}>Concurrent users</div>
                <div style={{ fontSize: '13px', color: '#4A4A4A', marginTop: '4px' }}>
                  Users actively querying the model at the same time
                </div>
              </div>
              <EditableNumber value={users} onChange={setUsers} min={1} max={10000} />
            </div>
            <div style={{ height: '24px' }} />
            <CustomSlider
              value={users}
              min={1}
              max={10000}
              onChange={setUsers}
              logarithmic
              ticks={userTicks}
              presets={userPresets}
            />
          </motion.div>

          <div style={{ height: '16px' }} />

          {/* Input 2: Requests per day */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }}
            style={{
              background: '#111113',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px',
              padding: '32px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#E8F0ED' }}>Requests per user per day</div>
                <div style={{ fontSize: '13px', color: '#4A4A4A', marginTop: '4px' }}>
                  Average number of queries each user sends daily
                </div>
              </div>
              <EditableNumber value={requests} onChange={setRequests} min={1} max={500} size="36px" />
            </div>
            <div style={{ height: '20px' }} />
            <CustomSlider
              value={requests}
              min={1}
              max={500}
              onChange={setRequests}
              ticks={requestTicks}
              presets={requestPresets}
            />
          </motion.div>

          <div style={{ height: '20px' }} />

          {/* Live calculation preview */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{
              background: 'rgba(0,212,170,0.03)',
              border: '1px solid rgba(0,212,170,0.1)',
              borderRadius: '12px',
              padding: '20px 24px',
            }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
            }}>
              {/* Daily tokens */}
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#4A4A4A', marginBottom: '4px' }}>
                  Daily tokens
                </div>
                <AnimatedNumber
                  value={calc.dailyTotal}
                  format={formatTokens}
                  color="#E8F0ED"
                  size="16px"
                  weight={500}
                />
              </div>

              {/* Monthly tokens */}
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#4A4A4A', marginBottom: '4px' }}>
                  Monthly tokens
                </div>
                <AnimatedNumber
                  value={calc.monthlyTotal}
                  format={formatTokens}
                  color="#E8F0ED"
                  size="16px"
                  weight={500}
                />
              </div>

              {/* Est. API cost */}
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#4A4A4A', marginBottom: '4px' }}>
                  Est. API cost
                </div>
                <AnimatedNumber
                  value={calc.apiCost}
                  format={formatCost}
                  color="#E8F0ED"
                  size="16px"
                  weight={500}
                />
                <div style={{ fontSize: '10px', color: '#4A4A4A', marginTop: '2px' }}>using GPT-4o pricing</div>
              </div>

              {/* KV cache memory */}
              <div>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#4A4A4A', marginBottom: '4px' }}>
                  KV cache memory
                </div>
                <AnimatedNumber
                  value={calc.kvTotalGB}
                  format={formatGB}
                  color={calc.kvTotalGB > 500 ? '#E8A84A' : '#00D4AA'}
                  size="16px"
                  weight={500}
                />
                {calc.kvTotalGB > 500 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: '10px', color: '#E8A84A', marginTop: '2px' }}
                  >
                    High — will need many GPUs
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* Bottom navigation */}
      <div
        className="fixed bottom-0 left-0 right-0"
        style={{
          background: 'linear-gradient(transparent 0%, #0A0A0C 50%)',
          padding: '24px 48px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => navigate('/model')}
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
        <button
          onClick={handleNext}
          className="cursor-pointer"
          style={{
            fontSize: '14px', fontWeight: 500, color: '#0A0A0C', backgroundColor: '#00D4AA',
            padding: '14px 36px', borderRadius: '8px', border: 'none',
            fontFamily: 'Outfit, sans-serif', transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#33DFBE')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#00D4AA')}
        >
          Next: Deployment preferences →
        </button>
      </div>
    </div>
  )
}
