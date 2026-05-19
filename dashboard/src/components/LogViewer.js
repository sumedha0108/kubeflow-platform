import React, { useEffect, useRef, useState } from 'react';
import { streamPodLogs } from '../api/client';

const styles = {
  container: {
    background: '#0d1117',
    borderRadius: '8px',
    padding: '16px',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.6',
    height: '400px',
    overflowY: 'auto',
    position: 'relative',
  },
  line: {
    color: '#e6edf3',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    padding: '1px 0',
  },
  timestamp: {
    color: '#7c83fd',
    marginRight: '8px',
  },
  errorLine: {
    color: '#ff7b72',
  },
  warnLine: {
    color: '#e3b341',
  },
  infoLine: {
    color: '#79c0ff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  podName: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  status: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '999px',
  },
  connected: {
    background: '#1a3a2a',
    color: '#3fb950',
  },
  disconnected: {
    background: '#2a1a1a',
    color: '#ff7b72',
  },
  empty: {
    color: '#484f58',
    textAlign: 'center',
    marginTop: '180px',
  },
  autoScroll: {
    position: 'sticky',
    bottom: '0',
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  scrollBtn: {
    background: '#21262d',
    border: '1px solid #30363d',
    color: '#8b949e',
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
  }
};

// Color-code log lines by severity
function getLineStyle(line) {
  const lower = line.toLowerCase();
  if (lower.includes('error') || lower.includes('err ') || lower.includes('fatal')) return styles.errorLine;
  if (lower.includes('warn')) return styles.warnLine;
  if (lower.includes('info')) return styles.infoLine;
  return styles.line;
}

// Split timestamp from log message if present
function parseLine(line) {
  const timestampRegex = /^(\d{4}-\d{2}-\d{2}T[\d:.Z]+)\s/;
  const match = line.match(timestampRegex);
  if (match) {
    const time = match[1].replace('T', ' ').substring(0, 19);
    const message = line.slice(match[0].length);
    return { time, message };
  }
  return { time: null, message: line };
}

export default function LogViewer({ namespace, podName }) {
  const [lines, setLines] = useState([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!namespace || !podName) return;

    setLines([]);
    setConnected(false);

    // Open WebSocket connection to the streaming endpoint
    const ws = streamPodLogs(namespace, podName);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setLines([`Connecting to ${podName}...`, '']);
    };

    ws.onmessage = (event) => {
      setLines(prev => [...prev.slice(-500), event.data]); // keep last 500 lines
    };

    ws.onerror = () => {
      setLines(prev => [...prev, 'WebSocket error — check that the API is reachable']);
    };

    ws.onclose = () => {
      setConnected(false);
      setLines(prev => [...prev, '', '--- stream ended ---']);
    };

    // Cleanup: close WebSocket when component unmounts or pod changes
    return () => {
      ws.close();
    };
  }, [namespace, podName]);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lines, autoScroll]);

  return (
    <div>
      <div style={styles.header}>
        <span style={styles.podName}>{podName}</span>
        <span style={{ ...styles.status, ...(connected ? styles.connected : styles.disconnected) }}>
          {connected ? '● live' : '○ disconnected'}
        </span>
      </div>

      <div style={styles.container}>
        {lines.length === 0 ? (
          <div style={styles.empty}>No logs yet</div>
        ) : (
          lines.map((line, i) => {
            const { time, message } = parseLine(line);
            return (
              <div key={i} style={getLineStyle(line)}>
                {time && <span style={styles.timestamp}>{time}</span>}
                {message}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.autoScroll}>
        <button
          style={styles.scrollBtn}
          onClick={() => setAutoScroll(!autoScroll)}
        >
          {autoScroll ? '⏸ pause scroll' : '▶ resume scroll'}
        </button>
      </div>
    </div>
  );
}
