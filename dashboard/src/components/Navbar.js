import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const styles = {
  nav: {
    background: '#1a1a2e',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    height: '56px',
    gap: '32px',
  },
  brand: {
    color: '#7c83fd',
    fontWeight: '700',
    fontSize: '18px',
    letterSpacing: '-0.5px',
  },
  link: {
    color: '#aaa',
    fontSize: '14px',
    padding: '4px 0',
    borderBottom: '2px solid transparent',
    transition: 'color 0.2s',
  },
  activeLink: {
    color: '#fff',
    borderBottom: '2px solid #7c83fd',
  },
};

export default function Navbar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>⎈ KubeFlow</span>
      <Link to="/" style={{
        ...styles.link,
        ...(isActive('/') ? styles.activeLink : {})
      }}>Apps</Link>
      <Link to="/deploy" style={{
        ...styles.link,
        ...(isActive('/deploy') ? styles.activeLink : {})
      }}>Deploy</Link>
    </nav>
  );
}
