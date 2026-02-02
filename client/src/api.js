import axios from 'axios';

// Automatically detect the current hostname (e.g., localhost or 192.168.1.5)
// and append the backend port (3000).
const API_BASE_URL = `http://${window.location.hostname}:3000/api`;
const STATIC_BASE_URL = `http://${window.location.hostname}:3000`;

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export { API_BASE_URL, STATIC_BASE_URL };
export default api;
