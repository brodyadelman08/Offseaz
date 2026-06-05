import { Outlet } from 'react-router-dom'
import Sidebar, { useIsMobile } from './Sidebar'

const SIDEBAR_W = 240

export default function Layout() {
  const isMobile = useIsMobile()

  return (
    <div style={styles.root}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          minHeight: '100vh',
          minWidth: 0,
          overflowX: 'hidden',
          marginLeft: isMobile ? 0 : SIDEBAR_W,
          padding: isMobile ? '24px 16px calc(80px + env(safe-area-inset-bottom))' : '36px 48px 60px',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
  },
}
