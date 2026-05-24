const LETTER_COLORS = ['#F75709', '#308EBD', '#F0BE24', '#F75709', '#308EBD', '#F0BE24', '#F75709']

export function Wordmark({ size = 28 }) {
  return (
    <span style={{
      fontFamily: "'Calibri', 'Trebuchet MS', 'Segoe UI', Helvetica, Arial, sans-serif",
      fontSize: size,
      fontWeight: 700,
      letterSpacing: -0.5,
      lineHeight: 1,
      userSelect: 'none',
    }}>
      {'Offseaz'.split('').map((ch, i) => (
        <span key={i} style={{ color: LETTER_COLORS[i] }}>{ch}</span>
      ))}
    </span>
  )
}
