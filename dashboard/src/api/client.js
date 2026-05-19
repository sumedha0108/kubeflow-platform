import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const listApps = () => client.get('/apps');
export const getApp = (name) => client.get(`/apps/${name}`);
export const deployApp = (data) => client.post('/apps', data);
export const scaleApp = (name, replicas) => client.put(`/apps/${name}/scale`, { replicas });
export const deleteApp = (name) => client.delete(`/apps/${name}`);
export const getPodLogs = (namespace, podName) => client.get(`/logs/${namespace}/${podName}`);
export const diagnosePod = (namespace, podName) =>
  client.post('/ai/diagnose', { namespace, pod_name: podName });

export const streamPodLogs = (namespace, podName) => {
  const wsBase = 'ws://api.platform.local';
  return new WebSocket(`${wsBase}/logs/stream/${namespace}/${podName}`);
};
