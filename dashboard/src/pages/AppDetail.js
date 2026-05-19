import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getApp, scaleApp, deleteApp } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import LogViewer from '../components/LogViewer';

const styles = {
  page: { padding: '32px', maxWidth: '960px', margin: '0 auto' },
  back: { color: '#7c83fd', fontSize: '14px', cursor: 'pointer', marginBottom: '16px', display: 'inline-block' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: '600' },
  image: { fontSize: '13px', color: '#6b7280', marginTop: '4px' },
  url: { fontSize: '13px', color: '#059669', marginTop: '2px' },
  card: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px' },
  cardTitle: { fontSize: '13px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' },
  scaleRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  scaleBtn: { width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: '18px' },
  replicaCount: { fontSize: '24px', fontWeight: '600', minWidth: '32px', textAlign: 'center' },
  applyBtn: { background: '#7c83fd', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  deleteBtn: { background: 'none', border: '1px solid #fca5a5', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  podRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' },
  podName: { fontFamily: 'monospace', fontSize: '13px' },
  podMeta: { fontSize: '12px', color: '#9ca3af', marginTop: '2px' },
  selectedPod: { background: '#f5f3ff', borderRadius: '8px', padding: '10px', marginBottom: '4px' },
  logsCard: { background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '16px' },
  hint: { fontSize: '12px', color: '#9ca3af', marginBottom: '12px' },
};

export default function AppDetail() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [replicas, setReplicas] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedPod, setSelectedPod] = useState(null);

  const fetchApp = async () => {
    try {
      const res = await getApp(name);
      setApp(res.data);
      setReplicas(res.data.desired_replicas);
      // auto-select first pod if none selected
      if (!selectedPod && res.data.pods?.length > 0) {
        setSelectedPod(res.data.pods[0]);
      }
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApp();
    const interval = setInterval(fetchApp, 5000);
    return () => clearInterval(interval);
  }, [name]);

  const handleScale = async () => {
    await scaleApp(name, replicas);
    fetchApp();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    await deleteApp(name);
    navigate('/');
  };

  if (loading || !app) return <div style={styles.page}>Loading...</div>;

  return (
    <div style={styles.page}>
      <span style={styles.back} onClick={() => navigate('/')}>← Back to Apps</span>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{app.name}</h1>
          <p style={styles.image}>{app.image}</p>
          {app.url && (
            <a href={app.url} target="_blank" rel="noreferrer" style={styles.url}>
              ↗ {app.url}
            </a>
          )}
        </div>
        <button style={styles.deleteBtn} onClick={handleDelete}>Delete App</button>
      </div>

      <div style={styles.card}>
        <p style={styles.cardTitle}>Scale</p>
        <div style={styles.scaleRow}>
          <button style={styles.scaleBtn} onClick={() => setReplicas(Math.max(1, replicas - 1))}>−</button>
          <span style={styles.replicaCount}>{replicas}</span>
          <button style={styles.scaleBtn} onClick={() => setReplicas(Math.min(5, replicas + 1))}>+</button>
          <button style={styles.applyBtn} onClick={handleScale}>Apply</button>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Current: {app.desired_replicas} replicas</span>
        </div>
      </div>

      <div style={styles.card}>
        <p style={styles.cardTitle}>Pods ({app.pods?.length || 0})</p>
        <p style={styles.hint}>Click a pod to view its logs</p>
        {app.pods?.map(pod => (
          <div
            key={pod.name}
            style={{
              ...styles.podRow,
              ...(selectedPod?.name === pod.name ? styles.selectedPod : {})
            }}
            onClick={() => setSelectedPod(pod)}
          >
            <div>
              <p style={styles.podName}>{pod.name}</p>
              <p style={styles.podMeta}>Node: {pod.node}</p>
            </div>
            <StatusBadge status={pod.phase} />
          </div>
        ))}
      </div>

      {selectedPod && (
        <div style={styles.logsCard}>
          <p style={styles.cardTitle}>Live Logs</p>
          <LogViewer
            namespace={name}
            podName={selectedPod.name}
          />
        </div>
      )}
    </div>
  );
}
