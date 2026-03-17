import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const fadeSlideUp = (delay, y = 15) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
})

const fadeIn = (delay, duration = 0.6) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration, delay, ease: 'easeOut' },
})

export default function LandingScreen() {
  const navigate = useNavigate()

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: '#0A0A0C' }}
    >
      {/* Radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,170,0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Badge */}
        <motion.div {...fadeSlideUp(0, 10)} transition={{ duration: 0.6, delay: 0, ease: 'easeOut' }}>
          <span
            className="inline-block"
            style={{
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '2px',
              color: '#6B6B6B',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '999px',
              padding: '6px 16px',
              textTransform: 'uppercase',
            }}
          >
            AI Infrastructure Calculator
          </span>
        </motion.div>

        <div style={{ height: '64px' }} />

        <motion.h1
          {...fadeSlideUp(0.2)}
          style={{
            fontSize: '48px',
            fontWeight: 300,
            color: '#E8F0ED',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Your data. Your infrastructure.
        </motion.h1>

        <motion.h1
          {...fadeSlideUp(0.4)}
          style={{
            fontSize: '48px',
            fontWeight: 600,
            color: '#00D4AA',
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Your terms.
        </motion.h1>

        <div style={{ height: '24px' }} />

        <motion.p
          {...fadeIn(0.6)}
          style={{
            fontSize: '18px',
            fontWeight: 300,
            color: '#8A8A8A',
            maxWidth: '500px',
            lineHeight: 1.6,
          }}
        >
          Find out exactly what it takes to run AI inside your compound wall.
        </motion.p>

        <div style={{ height: '48px' }} />

        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.9, ease: 'easeOut' }}
          whileHover={{ scale: 1.02, backgroundColor: '#33DFBE' }}
          onClick={() => navigate('/configure')}
          className="cursor-pointer"
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: '#0A0A0C',
            backgroundColor: '#00D4AA',
            padding: '16px 40px',
            borderRadius: '8px',
            border: 'none',
            fontFamily: 'Outfit, sans-serif',
            transition: 'background-color 0.2s ease',
          }}
        >
          Configure your deployment →
        </motion.button>

        <div style={{ height: '32px' }} />

        <motion.p
          {...fadeIn(1.1, 0.4)}
          style={{
            fontSize: '12px',
            color: '#4A4A4A',
          }}
        >
          Takes 90 seconds · No signup required
        </motion.p>
      </div>
    </div>
  )
}
