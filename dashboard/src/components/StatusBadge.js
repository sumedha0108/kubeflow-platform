import React from 'react';

const colors = {
  healthy:  { bg: '#d1fae5', text: '#065f46' },
  degraded: { bg: '#fee2e2', text: '#991b1b' },
  unknown:  { bg: '#f3f4f6', text: '#6b7280' },
  Running:  { bg: '#d1fae5', text: '#065f46' },
  Pending:  { bg: '#fef9c3', text: '#854d0e' },
  Failed:   { bg: '#fee2e2', text: '#991b1b' },
};

export default function StatusBadge({ status }) {
  const c = colors[status] || colors.unknown;
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
    }}>
      {status}
    </span>
  );
}
