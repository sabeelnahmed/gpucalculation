export default function StepProgress({ current = 2, total = 7 }) {
  return (
    <div className="flex items-center justify-center" style={{ gap: '4px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: '32px',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: i + 1 <= current ? '#00D4AA' : 'rgba(255,255,255,0.08)',
            transition: 'background-color 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}
