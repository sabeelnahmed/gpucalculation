import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useConfig } from '../store/ConfigContext'
import StepProgress from '../components/StepProgress'
import { calculateAll, formatCurrency, currencyRates, defaultTPS, comparisonData } from '../engine/calculate'

// ── Tiny slider ──

function Slider({ value, min, max, step = 1, onChange, logarithmic, ticks }) {
  const getPct = useCallback((v) => {
    if (logarithmic) return (Math.log(Math.max(v, 1)) / Math.log(max)) * 100
    return ((v - min) / (max - min)) * 100
  }, [logarithmic, min, max])

  const fromPct = useCallback((p) => {
    if (logarithmic) return Math.round(Math.max(1, Math.min(max, Math.exp((p / 100) * Math.log(max)))))
    return Math.round(Math.max(min, Math.min(max, min + (p / 100) * (max - min))))
  }, [logarithmic, min, max])

  const pct = getPct(value)

  return (
    <div>
      <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: '4px', borderRadius: '2px', background: '#00D4AA' }} />
        <input
          type="range" min={0} max={100} step={0.1}
          value={pct}
          onChange={(e) => onChange(fromPct(Number(e.target.value)))}
          style={{ position: 'absolute', width: '100%', height: '24px', opacity: 0, cursor: 'pointer', zIndex: 2 }}
        />
        <div style={{
          position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
          width: '20px', height: '20px', borderRadius: '50%', background: '#00D4AA',
          border: '3px solid #0A0A0C', boxShadow: '0 0 0 1px rgba(0,212,170,0.3)',
          pointerEvents: 'none', zIndex: 1,
        }} />
      </div>
      {ticks && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
          {ticks.map((t, i) => <span key={i} style={{ fontSize: '9px', color: '#4A4A4A' }}>{t}</span>)}
        </div>
      )}
    </div>
  )
}

// ── Context snap slider ──

const ctxValues = [2048, 4096, 8192, 16384, 32768, 65536, 131072]
const ctxLabels = ['2K', '4K', '8K', '16K', '32K', '64K', '128K']

function CtxSlider({ value, onChange }) {
  const idx = ctxValues.indexOf(value)
  const cur = idx >= 0 ? idx : 1
  return (
    <div>
      <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', left: 0, width: `${(cur / (ctxValues.length - 1)) * 100}%`, height: '4px', borderRadius: '2px', background: '#00D4AA' }} />
        <input
          type="range" min={0} max={ctxValues.length - 1} step={1} value={cur}
          onChange={(e) => onChange(ctxValues[Number(e.target.value)])}
          style={{ position: 'absolute', width: '100%', height: '24px', opacity: 0, cursor: 'pointer', zIndex: 2 }}
        />
        <div style={{
          position: 'absolute', left: `${(cur / (ctxValues.length - 1)) * 100}%`, transform: 'translateX(-50%)',
          width: '20px', height: '20px', borderRadius: '50%', background: '#00D4AA',
          border: '3px solid #0A0A0C', boxShadow: '0 0 0 1px rgba(0,212,170,0.3)',
          pointerEvents: 'none', zIndex: 1,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        {ctxLabels.map((l, i) => <span key={i} style={{ fontSize: '9px', color: '#4A4A4A' }}>{l}</span>)}
      </div>
    </div>
  )
}

// ── VRAM bar ──

function VramBar({ used, total }) {
  const pct = Math.min((used / total) * 100, 100)
  const color = pct > 90 ? '#E85A5A' : pct > 70 ? '#E8A84A' : '#00D4AA'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px' }} />
      </div>
      <span style={{ fontSize: '11px', color: '#8A8A8A', whiteSpace: 'nowrap' }}>{used}/{total} GB</span>
    </div>
  )
}

// ── Badge component ──

function Badge({ type }) {
  if (type === 'best_value') return <span style={{ fontSize: '8px', background: 'rgba(0,212,170,0.12)', color: '#00D4AA', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px', whiteSpace: 'nowrap' }}>Best value</span>
  if (type === 'fastest') return <span style={{ fontSize: '8px', background: 'rgba(74,158,255,0.12)', color: '#4A9EFF', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px', whiteSpace: 'nowrap' }}>Fastest</span>
  return null
}

// ── Main ──

export default function ResultsScreen() {
  const navigate = useNavigate()
  const { config } = useConfig()

  // Lever state
  const [targetTPS, setTargetTPS] = useState(defaultTPS[config.useCase] || 15)
  const [precision, setPrecision] = useState((config.precision || 'INT8').toLowerCase())
  const [contextLength, setContextLength] = useState(config.contextLength || 4096)
  const [concurrentUsers, setConcurrentUsers] = useState(config.concurrentUsers || 10)
  const [currency, setCurrency] = useState('SAR')
  const [sortCol, setSortCol] = useState('totalPriceUSD')
  const [sortAsc, setSortAsc] = useState(true)
  const [selectedGpuId, setSelectedGpuId] = useState(null)

  // Cloud/API toggles
  const defaultCloud = new Set(['aws', 'azure', 'gcp'])
  const defaultAPI = new Set(['gpt-4o', 'gemini-2.5-pro', 'claude-sonnet-4.6', 'claude-opus-4.6'])
  const [enabledCloud, setEnabledCloud] = useState(defaultCloud)
  const [enabledAPI, setEnabledAPI] = useState(defaultAPI)

  const model = config.model || {}
  const useCase = config.useCase || 'custom'

  const fmt = useCallback((usd) => formatCurrency(usd, currency), [currency])

  // Calculate
  const calc = useMemo(() => calculateAll({
    model, precision, contextLength, concurrentUsers,
    requestsPerDay: config.requestsPerDay || 25, targetTPS,
    deployment: config.deployment || 'onpremise',
    monthlyHours: config.monthlyOperatingHours || 730, useCase,
  }), [model, precision, contextLength, concurrentUsers, config.requestsPerDay, targetTPS, config.deployment, config.monthlyOperatingHours, useCase])

  if (!calc) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0C', fontFamily: 'Outfit, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#E8F0ED', marginBottom: '12px' }}>No configuration found</div>
          <button onClick={() => navigate('/configure')} style={{ fontSize: '14px', color: '#00D4AA', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>← Start configuring</button>
        </div>
      </div>
    )
  }

  // Sort table
  const sorted = [...calc.feasible].sort((a, b) => {
    const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0
    return sortAsc ? av - bv : bv - av
  })

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  const sortArrow = (col) => sortCol === col ? (sortAsc ? ' ▲' : ' ▼') : ''

  const ratingColor = { excellent: '#00D4AA', good: 'rgba(0,212,170,0.8)', acceptable: '#E8A84A', poor: '#E85A5A' }

  // Selected GPU for cost comparison (user pick or best-value default)
  const selectedGpu = useMemo(() => {
    if (selectedGpuId) {
      const found = calc.feasible.find(r => r.gpuId === selectedGpuId)
      if (found) return found
    }
    return calc.bestValue
  }, [selectedGpuId, calc.feasible, calc.bestValue])

  const selfHostedMonthly = selectedGpu ? (selectedGpu.totalPriceUSD / 36) + selectedGpu.monthlyPowerUSD : 0

  // Recompute cloud results for selected GPU
  // For each cloud provider, find cheapest feasible GPU they offer
  const allCloudOptions = useMemo(() => {
    const mh = config.monthlyOperatingHours || 730
    const results = []
    const providers = Object.entries(comparisonData.cloud_gpu_providers).filter(([k]) => !k.startsWith('_'))
    providers.forEach(([providerId, provider]) => {
      if (!provider?.hourly_rates) return
      let cheapest = null
      calc.feasible.forEach(gpu => {
        const rate = provider.hourly_rates?.[gpu.gpuId]
        if (!rate) return
        const monthlyCost = rate * gpu.totalGPUs * mh
        if (!cheapest || monthlyCost < cheapest.monthlyCostUSD) {
          cheapest = {
            id: providerId, name: provider.name, displayName: provider.display_name,
            brandColor: provider.brand_color, dataResidency: provider.data_residency,
            hourlyRate: rate, gpuCount: gpu.totalGPUs, gpuName: gpu.gpuName, gpuId: gpu.gpuId,
            monthlyCostUSD: monthlyCost,
          }
        }
      })
      if (cheapest) results.push(cheapest)
    })
    results.sort((a, b) => a.monthlyCostUSD - b.monthlyCostUSD)
    return results
  }, [calc.feasible, config.monthlyOperatingHours])

  const compBars = useMemo(() => {
    const bars = []
    // Self-hosted
    if (selectedGpu) {
      const depPerMo = selectedGpu.totalPriceUSD / 36
      const powerPerMo = selectedGpu.monthlyPowerUSD
      bars.push({ group: 'self', label: `Self-hosted · ${selectedGpu.totalGPUs}× ${selectedGpu.gpuName}`, sub: `${fmt(depPerMo)} hardware/36mo + ${fmt(powerPerMo)} power`, cost: selfHostedMonthly, color: '#00D4AA' })
    }
    // Cloud
    allCloudOptions.filter(c => enabledCloud.has(c.id)).forEach(c => {
      bars.push({ group: 'cloud', label: `${c.name} · ${c.gpuCount}× ${c.gpuName}`, sub: `$${c.hourlyRate}/hr`, cost: c.monthlyCostUSD, color: c.brandColor })
    })
    // API
    calc.apiResults.filter(a => enabledAPI.has(a.id)).forEach(a => {
      bars.push({ group: 'api', label: `${a.provider} ${a.name}`, sub: `$${a.inputRate}/$${a.outputRate} per M`, cost: a.monthlyCostUSD, color: '#6B6B6B' })
    })
    return bars
  }, [selectedGpu, selfHostedMonthly, allCloudOptions, calc.apiResults, enabledCloud, enabledAPI, fmt])

  const maxBarCost = Math.max(...compBars.map(b => b.cost), 1)

  const toggleSet = (set, setter, id) => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setter(next)
  }

  const allCloudProviders = Object.entries(comparisonData.cloud_gpu_providers).filter(([k]) => !k.startsWith('_'))
  const allAPIModels = []
  Object.entries(comparisonData.api_providers).filter(([k]) => !k.startsWith('_')).forEach(([, p]) => {
    if (!p?.models) return
    Object.entries(p.models).forEach(([id, m]) => {
      allAPIModels.push({ id, label: `${p.provider_name} ${m.name}` })
    })
  })

  const fmtCtx = (v) => v >= 1024 ? `${Math.round(v / 1024)}K` : v

  const monthlyTokensM = ((calc.monthlyInputTokens + calc.monthlyOutputTokens) / 1e6).toFixed(1)

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0C', fontFamily: 'Outfit, sans-serif' }}>
      <div className="flex flex-col items-center px-6 pt-8 pb-20" style={{ position: 'relative' }}>

        {/* Currency selector */}
        <div style={{ position: 'absolute', top: '12px', right: '24px', zIndex: 10 }}>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ background: '#1A1A1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#E8F0ED', fontFamily: 'Outfit, sans-serif', outline: 'none', cursor: 'pointer' }}
          >
            {Object.entries(currencyRates).map(([code, c]) => (
              <option key={code} value={code}>{code} — {c.name}</option>
            ))}
          </select>
        </div>

        {/* Back */}
        <div style={{ width: '100%', maxWidth: '1020px' }}>
          <button onClick={() => navigate('/configure')} className="cursor-pointer" style={{ fontSize: '13px', color: '#6B6B6B', background: 'none', border: 'none', fontFamily: 'Outfit, sans-serif', transition: 'color 0.2s ease' }}
            onMouseEnter={e => e.currentTarget.style.color = '#E8F0ED'} onMouseLeave={e => e.currentTarget.style.color = '#6B6B6B'}>← Reconfigure</button>
        </div>

        <div style={{ height: '8px' }} />

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} style={{ textAlign: 'center' }}>
          <StepProgress current={6} total={7} />
        </motion.div>
        <div style={{ height: '20px' }} />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ fontSize: '10px', color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Results</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }} style={{ fontSize: '32px', fontWeight: 400, color: '#E8F0ED', margin: '4px 0 0' }}>Optimize your deployment</motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} style={{ fontSize: '15px', color: '#8A8A8A', marginTop: '4px' }}>Adjust the levers. GPU recommendations and costs update in real time.</motion.p>

        <div style={{ height: '20px' }} />

        {/* Config summary */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ width: '100%', maxWidth: '1020px', background: '#111113', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {[['Model', model.name], ['Use case', useCase], ['Deploy', config.deployment], ['Sensitivity', config.sensitivity]].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: '10px', color: '#4A4A4A', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: '12px', fontWeight: 500, color: '#E8F0ED' }}>{v || '—'}</div></div>
          ))}
          <button onClick={() => navigate('/configure')} style={{ fontSize: '12px', color: '#00D4AA', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', marginLeft: 'auto' }}>Edit &gt;</button>
        </motion.div>

        <div style={{ height: '24px' }} />

        {/* ═══ LEVERS ═══ */}
        <div style={{ width: '100%', maxWidth: '1020px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#8A8A8A', marginBottom: '12px' }}>Tradeoff levers</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

            {/* Lever 1: Target speed */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8A8A8A' }}>Target speed</span>
                <span><span style={{ fontSize: '22px', fontWeight: 600, color: '#00D4AA', fontVariantNumeric: 'tabular-nums' }}>{targetTPS}</span> <span style={{ fontSize: '11px', color: '#4A4A4A' }}>tok/s</span></span>
              </div>
              <Slider value={targetTPS} min={5} max={60} onChange={setTargetTPS} ticks={['5 slow', '15', '30', '60 premium']} />
              <div style={{ fontSize: '10px', color: '#4A4A4A', marginTop: '4px' }}>Lower = fewer GPUs = cheaper</div>
            </motion.div>

            {/* Lever 2: Precision */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '12px', color: '#8A8A8A', marginBottom: '8px' }}>Precision</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['fp16', 'int8', 'int4'].map(p => {
                  const active = precision === p
                  const gb = (model.params_billion * ({ fp16: 2, int8: 1, int4: 0.5 }[p])).toFixed(0)
                  return (
                    <button key={p} onClick={() => setPrecision(p)} style={{
                      fontSize: '11px', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s ease',
                      background: active ? 'rgba(0,212,170,0.12)' : 'transparent', color: active ? '#00D4AA' : '#6B6B6B',
                      border: active ? '1px solid rgba(0,212,170,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}>{p.toUpperCase()} · {gb}GB</button>
                  )
                })}
              </div>
              <div style={{ fontSize: '10px', color: '#4A4A4A', marginTop: '8px' }}>INT8 nearly lossless. INT4 saves memory, may affect quality.</div>
            </motion.div>

            {/* Lever 3: Context */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8A8A8A' }}>Context length</span>
                <span style={{ fontSize: '22px', fontWeight: 600, color: '#00D4AA', fontVariantNumeric: 'tabular-nums' }}>{fmtCtx(contextLength)}</span>
              </div>
              <CtxSlider value={contextLength} onChange={setContextLength} />
              <div style={{ fontSize: '10px', color: '#4A4A4A', marginTop: '4px' }}>KV cache: {calc.kvTotalGB} GB for {concurrentUsers} users · Shorter = less memory</div>
            </motion.div>

            {/* Lever 4: Users */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8A8A8A' }}>Peak concurrent users</span>
                <span style={{ fontSize: '22px', fontWeight: 600, color: '#00D4AA', fontVariantNumeric: 'tabular-nums' }}>{concurrentUsers}</span>
              </div>
              <Slider value={concurrentUsers} min={1} max={1000} onChange={setConcurrentUsers} logarithmic ticks={['1', '10', '50', '100', '500', '1000']} />
              <div style={{ fontSize: '10px', color: '#4A4A4A', marginTop: '4px' }}>Peak is usually 30-50% of total users</div>
            </motion.div>
          </div>
        </div>

        <div style={{ height: '24px' }} />

        {/* ═══ GPU TABLE ═══ */}
        <div style={{ width: '100%', maxWidth: '1020px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#8A8A8A' }}>GPU configurations</span>
            <span style={{ fontSize: '10px', color: '#4A4A4A' }}>Click a row to use it in cost comparison below</span>
          </div>
          <div style={{ fontSize: '11px', marginBottom: '10px' }}>
            <span style={{ color: '#00D4AA' }}>{calc.weightGB} GB</span><span style={{ color: '#4A4A4A' }}> weights + </span>
            <span style={{ color: '#4A9EFF' }}>{calc.kvTotalGB} GB</span><span style={{ color: '#4A4A4A' }}> KV cache + </span>
            <span style={{ color: '#8A8A8A' }}>2 GB</span><span style={{ color: '#4A4A4A' }}> overhead = </span>
            <span style={{ color: '#E8F0ED', fontWeight: 500 }}>{calc.totalVRAMNeeded} GB</span><span style={{ color: '#4A4A4A' }}> total</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr>
                  {[
                    ['GPU', 'gpuName'], ['Count', 'totalGPUs'], ['VRAM', 'vramUtilization'], ['Max users', 'maxUsersTotal'],
                    ['tok/s', 'effectiveTPS'], ['Unit price', 'unitPriceUSD'], ['Total price', 'totalPriceUSD'], ['Power/mo', 'monthlyPowerUSD'],
                  ].map(([label, col]) => (
                    <th key={col} onClick={() => handleSort(col)} style={{
                      fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: sortCol === col ? '#8A8A8A' : '#4A4A4A', padding: '8px 6px',
                      textAlign: 'left', cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>{label}{sortArrow(col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {sorted.map((r, i) => (
                    <motion.tr
                      key={r.gpuId}
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.3 }}
                      onClick={() => setSelectedGpuId(r.gpuId)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.15s ease',
                        cursor: 'pointer',
                        background: (selectedGpu?.gpuId === r.gpuId) ? 'rgba(0,212,170,0.05)' : 'transparent',
                        borderLeft: (selectedGpu?.gpuId === r.gpuId) ? '3px solid #00D4AA' : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (selectedGpu?.gpuId !== r.gpuId) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { if (selectedGpu?.gpuId !== r.gpuId) e.currentTarget.style.background = 'transparent' }}
                    >
                      {/* GPU */}
                      <td style={{ padding: '10px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '36px', height: '24px', background: '#1A1A1E', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '7px', color: '#4A4A4A', textAlign: 'center', lineHeight: 1 }}>GPU</span>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#E8F0ED', whiteSpace: 'nowrap' }}>{r.gpuName}</div>
                            <div style={{ fontSize: '9px', color: '#4A4A4A' }}>{r.architecture}</div>
                          </div>
                        </div>
                      </td>
                      {/* Count */}
                      <td style={{ padding: '10px 6px', fontSize: '13px', fontWeight: 500, color: '#E8F0ED' }}>{r.totalGPUs > 1 ? `${r.totalGPUs}×` : '1'}</td>
                      {/* VRAM */}
                      <td style={{ padding: '10px 6px' }}><VramBar used={r.totalVRAMUsed} total={r.totalVRAMAvailable} /></td>
                      {/* Max users */}
                      <td style={{ padding: '10px 6px', fontSize: '13px', color: r.maxUsersTotal >= concurrentUsers ? '#00D4AA' : r.maxUsersTotal >= concurrentUsers * 0.8 ? '#E8A84A' : '#E85A5A' }}>{r.maxUsersTotal}</td>
                      {/* tok/s */}
                      <td style={{ padding: '10px 6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: ratingColor[r.latencyRating] }}>{r.effectiveTPS}</span>
                        {r._badge && <Badge type={r._badge} />}
                      </td>
                      {/* Unit price */}
                      <td style={{ padding: '10px 6px', fontSize: '12px', fontWeight: 500, color: '#E8F0ED' }}>{r.unitPriceUSD > 0 ? fmt(r.unitPriceUSD) : '—'}</td>
                      {/* Total price */}
                      <td style={{ padding: '10px 6px', fontSize: '12px', fontWeight: 500, color: '#E8F0ED' }}>{r.totalPriceUSD > 0 ? fmt(r.totalPriceUSD) : '—'}</td>
                      {/* Power/mo */}
                      <td style={{ padding: '10px 6px', fontSize: '12px', color: '#6B6B6B' }} title={r.powerBreakdown}>{fmt(r.monthlyPowerUSD)}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {/* Infeasible */}
                {calc.infeasible.map(r => (
                  <tr key={r.gpuId} style={{ opacity: 0.25, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#E8F0ED' }}>{r.gpuName}</div>
                      <div style={{ fontSize: '9px', color: '#4A4A4A' }}>{r.architecture}</div>
                    </td>
                    <td style={{ padding: '10px 6px', fontSize: '13px', color: '#6B6B6B' }}>—</td>
                    <td colSpan={6} style={{ padding: '10px 6px', fontSize: '9px', color: '#E85A5A', fontStyle: 'italic' }}>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: '10px', color: '#4A4A4A', textAlign: 'right', marginTop: '4px' }}>* Managed services quoted separately</div>
        </div>

        <div style={{ height: '28px' }} />

        {/* ═══ COST COMPARISON ═══ */}
        <div style={{ width: '100%', maxWidth: '1020px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#8A8A8A', marginBottom: '10px' }}>Cost comparison — monthly</div>

          {/* Cloud toggles */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#4A4A4A', marginBottom: '6px' }}>Cloud GPU providers</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {allCloudProviders.map(([id, p]) => {
                const on = enabledCloud.has(id)
                const hasGPU = allCloudOptions.some(c => c.id === id)
                return (
                  <button key={id} onClick={() => hasGPU && toggleSet(enabledCloud, setEnabledCloud, id)}
                    title={!hasGPU ? `No matching GPU available on ${p.name}` : ''}
                    style={{
                      fontSize: '10px', padding: '4px 10px', borderRadius: '6px', cursor: hasGPU ? 'pointer' : 'not-allowed', fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s',
                      background: on && hasGPU ? 'rgba(0,212,170,0.1)' : 'transparent',
                      color: !hasGPU ? '#2A2A2A' : on ? '#00D4AA' : '#4A4A4A',
                      border: on && hasGPU ? '1px solid rgba(0,212,170,0.2)' : '1px solid rgba(255,255,255,0.04)',
                      opacity: hasGPU ? 1 : 0.4,
                    }}>{p.name}</button>
                )
              })}
            </div>
          </div>

          {/* API toggles */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#4A4A4A', marginBottom: '6px' }}>API models</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {allAPIModels.map(m => {
                const on = enabledAPI.has(m.id)
                return (
                  <button key={m.id} onClick={() => toggleSet(enabledAPI, setEnabledAPI, m.id)} style={{
                    fontSize: '10px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s',
                    background: on ? 'rgba(0,212,170,0.1)' : 'transparent', color: on ? '#00D4AA' : '#4A4A4A',
                    border: on ? '1px solid rgba(0,212,170,0.2)' : '1px solid rgba(255,255,255,0.04)',
                  }}>{m.label}</button>
                )
              })}
            </div>
          </div>

          <div style={{ fontSize: '10px', color: '#4A4A4A', marginBottom: '12px' }}>
            {concurrentUsers} users × {config.requestsPerDay || 25} req/day × 30 days = {monthlyTokensM}M tokens/mo
          </div>

          {/* Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {['self', 'cloud', 'api'].map((group, gi) => {
              const rows = compBars.filter(b => b.group === group)
              if (rows.length === 0) return null
              const headers = { self: 'SELF-HOSTED', cloud: 'CLOUD GPU — same model, your control', api: 'API — different model, data leaves your premises' }
              return (
                <div key={group}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#4A4A4A', marginBottom: '4px', marginTop: gi > 0 ? '8px' : 0 }}>{headers[group]}</div>
                  {rows.map((bar, i) => (
                    <motion.div key={bar.label + i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: bar.color, flexShrink: 0 }} />
                      <div style={{ width: '140px', flexShrink: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#E8F0ED', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bar.label}</div>
                        <div style={{ fontSize: '9px', color: '#4A4A4A' }}>{bar.sub}</div>
                      </div>
                      <div style={{ flex: 1, position: 'relative', height: '24px' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max((bar.cost / maxBarCost) * 100, 2)}%` }}
                          transition={{ delay: 0.8 + (gi * 3 + i) * 0.06, duration: 0.4, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: '4px', background: bar.color, opacity: 0.7 }}
                        />
                      </div>
                      <div style={{ width: '100px', flexShrink: 0, textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#E8F0ED' }}>{fmt(bar.cost)}</span>
                        <span style={{ fontSize: '9px', color: '#4A4A4A' }}>/mo</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: '9px', color: '#4A4A4A', fontStyle: 'italic', marginTop: '6px' }}>
            Cloud GPU = same open-source model, your control. API = different (likely more capable) model, data leaves.
          </div>
        </div>

        {/* ═══ SOVEREIGNTY CALLOUT ═══ */}
        {(config.sensitivity === 'confidential' || config.sensitivity === 'regulated') && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            style={{
              width: '100%', maxWidth: '1020px', marginTop: '20px',
              background: 'rgba(0,212,170,0.03)', borderLeft: '3px solid #00D4AA',
              borderRadius: '0 8px 8px 0', padding: '14px 20px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#00D4AA' }}>Your data never leaves your compound wall</div>
            <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '4px' }}>
              Self-hosted: data on your premises. Cloud GPU: data on rented servers. API: data sent to US (OpenAI), US/EU (Anthropic), US (Google).
            </div>
          </motion.div>
        )}

        <div style={{ height: '28px' }} />

        {/* ═══ ACTIONS ═══ */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => console.log('generate PDF report')} className="cursor-pointer" style={{
            fontSize: '14px', fontWeight: 500, color: '#00D4AA', background: 'transparent',
            border: '1.5px solid rgba(0,212,170,0.4)', padding: '13px 30px', borderRadius: '8px',
            fontFamily: 'Outfit, sans-serif', transition: 'all 0.2s ease',
          }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Download report</button>
          <motion.button onClick={() => console.log('book consultation')} className="cursor-pointer"
            whileHover={{ scale: 1.02, backgroundColor: '#33DFBE' }}
            style={{
              fontSize: '14px', fontWeight: 500, color: '#0A0A0C', backgroundColor: '#00D4AA',
              border: 'none', padding: '13px 30px', borderRadius: '8px',
              fontFamily: 'Outfit, sans-serif', transition: 'background-color 0.2s ease',
            }}>Book a consultation</motion.button>
        </div>

        <div style={{ fontSize: '10px', color: '#4A4A4A', textAlign: 'center', marginTop: '16px', maxWidth: '500px' }}>
          * Managed services quoted separately during consultation.<br />
          Calculations based on published specs and market pricing as of March 2026.
        </div>

      </div>
    </div>
  )
}
