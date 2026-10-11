// frontend/src/api/axios.js
import axios from 'axios';
import env from '../config/env';

const api = axios.create({ baseURL: env.apiUrl, timeout: 15000 });

// Ajoute le jeton de session s'il existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cs_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;