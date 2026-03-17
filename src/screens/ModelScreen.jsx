import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useConfig } from '../store/ConfigContext'
import StepProgress from '../components/StepProgress'
import AnimatedReveal from '../components/AnimatedReveal'
import modelsData from '../../models_complete.json'

const allModels = Object.entries(modelsData.models)
  .filter(([k]) => !k.startsWith('_'))
  .map(([id, m]) => ({ id, ...m }))

const recMatrix = modelsData.recommendation_matrix

const categoryFilters = [
  { key: 'all', label: 'All' },
  { key: 'tiny', label: 'Tiny (<3B)' },
  { key: 'small', label: 'Small (3–9B)' },
  { key: 'medium', label: 'Medium (10–34B)' },
  { key: 'large', label: 'Large (35–80B)' },
  { key: 'xlarge', label: 'XL (100B+)' },
  { key: 'frontier', label: 'Frontier (400B+)' },
]

const useCaseDisplayNames = {
  chatbot: 'Chatbot',
  knowledge: 'Knowledge Assistant',
  summarization: 'Document Summarization',
  code: 'Code Generation',
  compliance: 'Compliance Review',
  arabic: 'Arabic NLP',
  batch: 'Batch Processing',
  custom: 'Custom',
}

function formatCtx(ctx) {
  if (!ctx) return ''
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(0)}M ctx`
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}K ctx`
  return `${ctx} ctx`
}

function formatParams(m) {
  if (m.active_params_billion) {
    return `${m.active_params_billion}B active / ${m.params_billion}B total`
  }
  return `${m.params_billion}B`
}

function ArabicDots({ quality }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: i <= quality ? '#00D4AA' : 'rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </div>
  )
}

function ModelCard({ model, isSelected, isRecommended, precision, onClick }) {
  const precisionKey = precision?.toLowerCase() || 'int8'
  const vram = model.weight_memory_gb || {}
  const isMoE = !!model.active_params_billion

  return (
    <motion.div
      layout
      onClick={onClick}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        position: 'relative',
        background: isSelected ? '#131315' : isRecommended ? 'rgba(0,212,170,0.02)' : '#111113',
        border: isSelected
          ? '1.5px solid rgba(0,212,170,0.4)'
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: isSelected ? '20px 20px 20px 23px' : '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        outline: 'none',
      }}
      whileHover={{
        borderColor: isSelected ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.12)',
        backgroundColor: isSelected ? '#131315' : '#141416',
      }}
    >
      {/* Left accent bar */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            background: '#00D4AA',
            borderRadius: '12px 0 0 12px',
          }}
        />
      )}

      {/* Row 1 — Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#E8F0ED', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {model.name}
          </span>
          {isMoE && (
            <span style={{
              fontSize: '9px',
              background: 'rgba(0,212,170,0.1)',
              color: '#00D4AA',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 600,
              flexShrink: 0,
            }}>
              MoE
            </span>
          )}
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 500,
          background: 'rgba(255,255,255,0.06)',
          color: '#8A8A8A',
          padding: '3px 10px',
          borderRadius: '999px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          marginLeft: '8px',
        }}>
          {formatParams(model)}
        </span>
      </div>

      {/* Row 2 — Developer + license */}
      <div style={{ marginTop: '4px', fontSize: '12px', color: '#6B6B6B' }}>
        {model.developer}
        {model.license && (
          <span style={{ color: '#4A4A4A' }}> · {model.license}</span>
        )}
      </div>

      {/* Row 3 — VRAM specs */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
        {['fp16', 'int8', 'int4'].map((p) => {
          const isActive = p === precisionKey
          const val = vram[p]
          return (
            <div key={p}>
              <div style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: isActive ? 'rgba(0,212,170,0.6)' : '#4A4A4A',
                marginBottom: '2px',
              }}>
                {p.toUpperCase()}
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                color: isActive ? '#00D4AA' : '#6B6B6B',
              }}>
                {val != null ? `${val} GB` : '—'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Row 4 — Arabic quality + architecture */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: '#4A4A4A' }}>Arabic</span>
          <ArabicDots quality={model.arabic_quality || 0} />
        </div>
        <span style={{
          fontSize: '11px',
          color: isMoE ? 'rgba(0,212,170,0.7)' : '#4A4A4A',
        }}>
          {isMoE ? `${model.active_params_billion}B active` : formatCtx(model.max_context)}
        </span>
      </div>

      {/* Row 5 — Strengths */}
      {model.strengths?.length > 0 && (
        <div style={{
          marginTop: '12px',
          fontSize: '11px',
          color: '#4A4A4A',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {model.strengths.slice(0, 2).join(' · ')}
        </div>
      )}

      {/* Row 6 — Recommendation badge */}
      {isRecommended && (
        <div style={{ marginTop: '10px' }}>
          <span style={{
            fontSize: '11px',
            background: 'rgba(0,212,170,0.08)',
            color: '#00D4AA',
            padding: '4px 12px',
            borderRadius: '6px',
            display: 'inline-block',
          }}>
            Recommended for {useCaseDisplayNames[isRecommended] || isRecommended}
          </span>
        </div>
      )}
    </motion.div>
  )
}

function CustomModelCard({ isSelected, customConfig, setCustomConfig, onClick }) {
  const [expanded, setExpanded] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleClick = () => {
    if (!expanded) setExpanded(true)
    onClick()
  }

  const estimateLayers = (params) => Math.max(1, Math.round(params * 1.2))
  const estimateHiddenDim = (params) => Math.max(256, Math.round(Math.sqrt(params * 1e9 / 12)))
  const estimateHeads = (hiddenDim) => Math.max(1, Math.round(hiddenDim / 128))

  const updateParam = (key, val) => {
    const next = { ...customConfig, [key]: val }
    if (key === 'params_billion' && val > 0) {
      next.num_layers = estimateLayers(val)
      next.hidden_dim = estimateHiddenDim(val)
      next.num_attention_heads = estimateHeads(next.hidden_dim)
      next.num_kv_heads = Math.max(1, Math.round(next.num_attention_heads / 8))
      next.head_dim = 128
    }
    setCustomConfig(next)
  }

  const inputStyle = {
    background: '#1A1A1E',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#00D4AA',
    fontFamily: 'Outfit, sans-serif',
    outline: 'none',
  }

  const smallInputStyle = {
    ...inputStyle,
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 12px',
    width: '100px',
    color: '#E8F0ED',
  }

  return (
    <motion.div
      layout
      onClick={handleClick}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      style={{
        position: 'relative',
        background: isSelected ? '#131315' : 'transparent',
        border: isSelected
          ? '1.5px solid rgba(0,212,170,0.4)'
          : '1px dashed rgba(255,255,255,0.15)',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        outline: 'none',
      }}
      whileHover={{
        borderColor: isSelected ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.25)',
      }}
    >
      {isSelected && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: '3px', background: '#00D4AA', borderRadius: '12px 0 0 12px',
        }} />
      )}

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '20px', color: '#6B6B6B' }}>✦</div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: '#E8F0ED', marginTop: '4px' }}>Custom model</div>
        <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '4px' }}>Enter parameter count manually</div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Params input */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="e.g., 30"
                  value={customConfig.params_billion || ''}
                  onChange={(e) => updateParam('params_billion', Number(e.target.value))}
                  style={{ ...inputStyle, fontSize: '28px', fontWeight: 500, padding: '12px 16px', width: '160px', textAlign: 'center' }}
                />
                <span style={{ fontSize: '16px', color: '#6B6B6B' }}>B</span>
              </div>

              {/* Architecture toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                {['dense', 'moe'].map((arch) => (
                  <button
                    key={arch}
                    onClick={() => setCustomConfig({ ...customConfig, architecture: arch })}
                    style={{
                      fontSize: '12px',
                      padding: '6px 14px',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      fontFamily: 'Outfit, sans-serif',
                      transition: 'all 0.2s ease',
                      background: customConfig.architecture === arch ? 'rgba(0,212,170,0.12)' : 'transparent',
                      color: customConfig.architecture === arch ? '#00D4AA' : '#6B6B6B',
                      border: customConfig.architecture === arch
                        ? '1px solid rgba(0,212,170,0.25)'
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {arch === 'dense' ? 'Dense' : 'Mixture of Experts'}
                  </button>
                ))}
              </div>

              {/* MoE active params */}
              {customConfig.architecture === 'moe' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active:</span>
                  <input
                    type="number"
                    placeholder="e.g., 8"
                    value={customConfig.active_params_billion || ''}
                    onChange={(e) => setCustomConfig({ ...customConfig, active_params_billion: Number(e.target.value) })}
                    style={{ ...inputStyle, fontSize: '20px', fontWeight: 500, padding: '8px 12px', width: '100px', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: '14px', color: '#6B6B6B' }}>B</span>
                </div>
              )}

              {/* Advanced toggle */}
              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    fontSize: '11px', color: '#4A4A4A', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {showAdvanced ? '▾' : '▸'} Advanced architecture details
                </button>
              </div>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                      marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                    }}>
                      {[
                        { key: 'num_layers', label: 'Layers' },
                        { key: 'hidden_dim', label: 'Hidden dim' },
                        { key: 'num_attention_heads', label: 'Attn heads' },
                        { key: 'num_kv_heads', label: 'KV heads' },
                        { key: 'head_dim', label: 'Head dim' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label style={{ fontSize: '10px', color: '#4A4A4A', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>
                            {label}
                          </label>
                          <input
                            type="number"
                            value={customConfig[key] || ''}
                            onChange={(e) => setCustomConfig({ ...customConfig, [key]: Number(e.target.value) })}
                            style={smallInputStyle}
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ModelScreen() {
  const navigate = useNavigate()
  const { config, update } = useConfig()
  const useCase = config.useCase || 'chatbot'
  const precision = config.precision || 'int8'

  const [selectedId, setSelectedId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [customConfig, setCustomConfig] = useState({
    id: 'custom',
    params_billion: 0,
    architecture: 'dense',
    active_params_billion: 0,
    num_layers: 0,
    hidden_dim: 0,
    num_attention_heads: 0,
    num_kv_heads: 0,
    head_dim: 128,
  })

  const recommended = recMatrix[useCase] || []

  const sortedModels = useMemo(() => {
    let filtered = [...allModels]

    // Filter by category
    if (activeFilter !== 'all') {
      filtered = filtered.filter((m) => m.category === activeFilter)
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (m) => m.name.toLowerCase().includes(q) || m.developer.toLowerCase().includes(q)
      )
    }

    // Sort: recommended first (in matrix order), then by params ascending
    const recSet = new Set(recommended)
    const recModels = []
    const otherModels = []

    for (const m of filtered) {
      if (recSet.has(m.id)) recModels.push(m)
      else otherModels.push(m)
    }

    recModels.sort((a, b) => recommended.indexOf(a.id) - recommended.indexOf(b.id))
    otherModels.sort((a, b) => a.params_billion - b.params_billion)

    return [...recModels, ...otherModels]
  }, [activeFilter, search, recommended])

  const totalCount = allModels.length
  const shownCount = sortedModels.length

  const isCustomSelected = selectedId === 'custom'

  const handleSelect = (id) => {
    setSelectedId(id)
  }

  const handleNext = () => {
    let modelData
    if (isCustomSelected) {
      modelData = customConfig
    } else {
      const found = allModels.find((m) => m.id === selectedId)
      modelData = found || null
    }
    update({ model: modelData })
    navigate('/scale')
  }

  const canProceed = selectedId && (selectedId !== 'custom' || customConfig.params_billion > 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0C', fontFamily: 'Outfit, sans-serif' }}>
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-28">
        {/* Step progress */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <StepProgress current={3} total={7} />
        </motion.div>

        <div style={{ height: '28px' }} />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{ fontSize: '13px', color: '#6B6B6B', letterSpacing: '1px', textTransform: 'uppercase', margin: 0, fontWeight: 400 }}
        >
          Step 2 of 6
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
          style={{ fontSize: '32px', fontWeight: 400, color: '#E8F0ED', margin: '6px 0 0 0' }}
        >
          Choose your model
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{ fontSize: '15px', color: '#8A8A8A', marginTop: '6px' }}
        >
          We'll calculate the exact hardware based on your selection.
        </motion.p>

        <div style={{ height: '28px' }} />

        {/* Filters + Search row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          style={{
            width: '100%',
            maxWidth: '960px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Filter pills */}
          <div role="tablist" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categoryFilters.map((f) => {
              const isActive = activeFilter === f.key
              return (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveFilter(f.key)}
                  style={{
                    fontSize: '12px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'rgba(0,212,170,0.12)' : 'transparent',
                    color: isActive ? '#00D4AA' : '#6B6B6B',
                    border: isActive
                      ? '1px solid rgba(0,212,170,0.25)'
                      : '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#8A8A8A'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#6B6B6B'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                    }
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search models..."
            aria-label="Search models"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '220px',
              background: '#1A1A1E',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              color: '#E8F0ED',
              fontFamily: 'Outfit, sans-serif',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(0,212,170,0.3)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </motion.div>

        {/* Model count */}
        <div style={{ width: '100%', maxWidth: '960px', marginTop: '12px' }}>
          <span style={{ fontSize: '12px', color: '#4A4A4A' }}>
            {activeFilter !== 'all' || search
              ? `Showing ${shownCount} of ${totalCount} models`
              : `Showing ${totalCount} models`}
          </span>
        </div>

        <div style={{ height: '16px' }} />

        {/* Model cards grid */}
        <div
          role="listbox"
          className="grid w-full"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            maxWidth: '960px',
          }}
        >
          <AnimatePresence mode="popLayout">
            {sortedModels.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: Math.min(i * 0.03, 0.6), duration: 0.35, ease: 'easeOut' }}
                layout
              >
                <ModelCard
                  model={m}
                  isSelected={selectedId === m.id}
                  isRecommended={recommended.includes(m.id) ? useCase : null}
                  precision={precision}
                  onClick={() => handleSelect(m.id)}
                />
              </motion.div>
            ))}

            {/* Custom model card */}
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(sortedModels.length * 0.03, 0.6) + 0.05, duration: 0.35, ease: 'easeOut' }}
              layout
            >
              <CustomModelCard
                isSelected={isCustomSelected}
                customConfig={customConfig}
                setCustomConfig={setCustomConfig}
                onClick={() => handleSelect('custom')}
              />
            </motion.div>
          </AnimatePresence>
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
          onClick={() => navigate('/configure')}
          className="cursor-pointer"
          style={{
            fontSize: '14px',
            color: '#6B6B6B',
            background: 'none',
            border: 'none',
            fontFamily: 'Outfit, sans-serif',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#E8F0ED')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B6B6B')}
        >
          ← Back
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="cursor-pointer"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#0A0A0C',
            backgroundColor: '#00D4AA',
            padding: '14px 36px',
            borderRadius: '8px',
            border: 'none',
            fontFamily: 'Outfit, sans-serif',
            opacity: canProceed ? 1 : 0.3,
            pointerEvents: canProceed ? 'auto' : 'none',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (canProceed) e.currentTarget.style.backgroundColor = '#33DFBE'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#00D4AA'
          }}
        >
          Next: Set your scale →
        </button>
      </div>
    </div>
  )
}
