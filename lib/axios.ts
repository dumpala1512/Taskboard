import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// We can add interceptors here later if needed (e.g. attaching auth tokens if we move off NextAuth's built-in fetch)
