import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useConfig } from '../store/ConfigContext'
import StepProgress from '../components/StepProgress'
import DarkDropdown from '../components/DarkDropdown'
import AnimatedReveal from '../components/AnimatedReveal'

const useCases = [
  { id: 'chatbot', icon: '◈', title: 'Customer-facing chatbot', desc: 'Real-time conversations with your customers or employees' },
  { id: 'knowledge', icon: '◇', title: 'Internal knowledge assistant', desc: 'Answer questions from your company\'s documents and data' },
  { id: 'summarization', icon: '▣', title: 'Document summarization', desc: 'Condense long reports, contracts, and filings into key points' },
  { id: 'code', icon: '⟨/⟩', title: 'Code generation', desc: 'AI-assisted coding, code review, and technical documentation' },
  { id: 'compliance', icon: '◫', title: 'Compliance and legal review', desc: 'Analyze regulatory documents, flag risks, check policies' },
  { id: 'arabic', icon: 'ع', title: 'Arabic NLP and translation', desc: 'Arabic-first language tasks, translation, and content generation' },
  { id: 'batch', icon: '⧉', title: 'Batch data processing', desc: 'High-volume offline processing — classification, extraction, tagging' },
  { id: 'custom', icon: '✦', title: 'Custom', desc: 'I know my requirements — let me configure manually' },
]

const defaults = {
  chatbot: { precision: 'INT8', context: 4096, mode: 'inference' },
  knowledge: { precision: 'INT8', context: 8192, mode: 'inference' },
  summarization: { precision: 'INT8', context: 16384, mode: 'inference' },
  code: { precision: 'FP16', context: 8192, mode: 'inference' },
  compliance: { precision: 'FP16', context: 32768, mode: 'inference' },
  arabic: { precision: 'INT8', context: 4096, mode: 'inference' },
  batch: { precision: 'INT4', context: 4096, mode: 'inference' },
  custom: { precision: 'INT8', context: 4096, mode: 'inference' },
}

const precisionOptions = ['FP16', 'INT8', 'INT4']
const contextOptions = [
  { value: 2048, label: '2,048 tokens' },
  { value: 4096, label: '4,096 tokens' },
  { value: 8192, label: '8,192 tokens' },
  { value: 16384, label: '16,384 tokens' },
  { value: 32768, label: '32,768 tokens' },
  { value: 65536, label: '65,536 tokens' },
  { value: 131072, label: '131,072 tokens' },
]

export default function ConfigureScreen() {
  const navigate = useNavigate()
  const { update } = useConfig()
  const [selected, setSelected] = useState(null)
  const [precision, setPrecision] = useState(null)
  const [context, setContext] = useState(null)

  const handleSelect = (id) => {
    setSelected(id)
    setPrecision(defaults[id].precision)
    setContext(defaults[id].context)
  }

  const recommendedPrecision = selected ? defaults[selected].precision : null
  const recommendedContext = selected ? defaults[selected].context : null

  const handleNext = () => {
    update({
      useCase: selected,
      precision,
      contextLength: context,
      mode: 'inference',
    })
    navigate('/model')
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0A0A0C', fontFamily: 'Outfit, sans-serif' }}
    >
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-28">
        {/* Step progress */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <StepProgress current={2} total={7} />
        </motion.div>

        <div style={{ height: '28px' }} />

        {/* Step label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            fontSize: '13px',
            color: '#6B6B6B',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            margin: 0,
            fontWeight: 400,
          }}
        >
          Step 1 of 6
        </motion.p>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
          style={{
            fontSize: '32px',
            fontWeight: 400,
            color: '#E8F0ED',
            margin: '6px 0 0 0',
          }}
        >
          What are you building?
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          style={{
            fontSize: '15px',
            color: '#8A8A8A',
            marginTop: '6px',
          }}
        >
          Pick the use case closest to yours. We'll optimize everything around it.
        </motion.p>

        <div style={{ height: '28px' }} />

        {/* Cards grid */}
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            maxWidth: '860px',
          }}
        >
          {useCases.map((uc, i) => {
            const isSelected = selected === uc.id
            return (
              <motion.div
                key={uc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
                onClick={() => handleSelect(uc.id)}
                className="cursor-pointer"
                style={{
                  position: 'relative',
                  background: isSelected ? '#131315' : '#111113',
                  border: isSelected
                    ? '1.5px solid rgba(0,212,170,0.4)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  padding: '20px 18px',
                  transition: 'all 0.2s ease',
                  overflow: 'hidden',
                }}
                whileHover={{
                  borderColor: isSelected ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.12)',
                  backgroundColor: isSelected ? '#131315' : '#151517',
                }}
              >
                {/* Left accent bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: isSelected ? '40%' : '0%',
                    background: '#00D4AA',
                    borderRadius: '0 2px 2px 0',
                    transition: 'height 0.25s ease',
                  }}
                />

                {/* Subtle teal glow on selected */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'radial-gradient(ellipse at top left, rgba(0,212,170,0.04) 0%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  style={{
                    fontSize: '20px',
                    color: isSelected ? '#00D4AA' : '#6B6B6B',
                    fontFamily: 'monospace',
                    transition: 'color 0.2s ease',
                    lineHeight: 1,
                  }}
                >
                  {uc.icon}
                </div>

                <div style={{ height: '10px' }} />

                {/* Title */}
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isSelected ? '#E8F0ED' : '#C8C8C8',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {uc.title}
                </div>

                <div style={{ height: '4px' }} />

                {/* Description */}
                <div
                  style={{
                    fontSize: '12px',
                    color: '#5A5A5A',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {uc.desc}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Auto-filled defaults */}
        <div className="w-full" style={{ maxWidth: '860px' }}>
          <AnimatedReveal show={!!selected}>
            <div style={{ paddingTop: '24px' }}>
              {/* Thin separator */}
              <div
                style={{
                  height: '1px',
                  background: 'rgba(255,255,255,0.04)',
                  marginBottom: '20px',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: '20px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Precision */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      color: '#7A7A7A',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    Precision
                  </label>
                  <DarkDropdown
                    value={precision}
                    options={precisionOptions}
                    onChange={setPrecision}
                    recommendedValue={recommendedPrecision}
                  />
                </div>

                {/* Context length */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      color: '#7A7A7A',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    Context length
                  </label>
                  <DarkDropdown
                    value={context}
                    options={contextOptions}
                    onChange={setContext}
                    recommendedValue={recommendedContext}
                  />
                </div>

                {/* Mode */}
                <div>
                  <label
                    style={{
                      fontSize: '11px',
                      color: '#7A7A7A',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      display: 'block',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    Mode
                  </label>
                  <span
                    style={{
                      display: 'inline-block',
                      background: 'rgba(0,212,170,0.08)',
                      color: '#00D4AA',
                      borderRadius: '999px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 500,
                      letterSpacing: '0.3px',
                    }}
                  >
                    Inference
                  </span>
                </div>
              </div>

              {/* Hint */}
              <p
                style={{
                  fontSize: '12px',
                  color: '#5A5A5A',
                  fontStyle: 'italic',
                  marginTop: '14px',
                  textAlign: 'center',
                }}
              >
                These defaults are optimized for your use case. Adjust if needed.
              </p>
            </div>
          </AnimatedReveal>
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
          onClick={() => navigate('/')}
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
          disabled={!selected}
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
            opacity: selected ? 1 : 0.3,
            pointerEvents: selected ? 'auto' : 'none',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (selected) e.currentTarget.style.backgroundColor = '#33DFBE'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#00D4AA'
          }}
        >
          Next: Choose your model →
        </button>
      </div>
    </div>
  )
}
