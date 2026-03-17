import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function AnimatedReveal({ show, children }) {
  const [animating, setAnimating] = useState(false)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onAnimationStart={() => setAnimating(true)}
          onAnimationComplete={() => setAnimating(false)}
          style={{ overflow: animating ? 'hidden' : 'visible' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
