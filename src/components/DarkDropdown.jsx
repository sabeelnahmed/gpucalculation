import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function DarkDropdown({ value, options, onChange, recommendedValue }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayLabel = (opt) => {
    const label = typeof opt === 'object' ? opt.label : opt
    const val = typeof opt === 'object' ? opt.value : opt
    if (val === recommendedValue) {
      return (
        <span>
          {label} <span style={{ color: '#00D4AA', fontSize: '12px' }}>· recommended</span>
        </span>
      )
    }
    return label
  }

  const currentLabel = options.find((o) => (typeof o === 'object' ? o.value : o) === value)
  const currentDisplay = currentLabel
    ? typeof currentLabel === 'object'
      ? currentLabel.label
      : currentLabel
    : value

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: '180px', zIndex: open ? 100 : 1 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: '#1A1A1E',
          border: open ? '1px solid rgba(0,212,170,0.4)' : '1px solid rgba(255,255,255,0.08)',
          color: '#E8F0ED',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '13px',
          fontFamily: 'Outfit, sans-serif',
          transition: 'border-color 0.2s ease',
        }}
      >
        <span>
          {currentDisplay}
          {value === recommendedValue && (
            <span style={{ color: '#00D4AA', fontSize: '12px' }}> · recommended</span>
          )}
        </span>
        <span
          style={{
            color: '#6B6B6B',
            fontSize: '10px',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s ease',
            marginLeft: '8px',
            display: 'inline-block',
          }}
        >
          ▼
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              background: '#1A1A1E',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              overflow: 'hidden',
              zIndex: 100,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {options.map((opt) => {
              const val = typeof opt === 'object' ? opt.value : opt
              return (
                <div
                  key={val}
                  onClick={() => {
                    onChange(val)
                    setOpen(false)
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: val === value ? '#00D4AA' : '#E8F0ED',
                    background: val === value ? 'rgba(0,212,170,0.06)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (val !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      val === value ? 'rgba(0,212,170,0.06)' : 'transparent'
                  }}
                >
                  {displayLabel(opt)}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
