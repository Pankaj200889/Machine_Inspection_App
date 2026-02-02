import axios from 'axios';

// 1. Check for Environment Variable (Set in .env.production for Android/Cloud)
// 2. Fallback to Localhost:3000 if on Dev Port 5173
// 3. Fallback to Relative/Origin if served from same domain
let STATIC_BASE_URL = '';

if (import.meta.env.VITE_API_BASE_URL) {
    STATIC_BASE_URL = import.meta.env.VITE_API_BASE_URL;
} else if (window.location.port === '5173') {
    STATIC_BASE_URL = `http://${window.location.hostname}:3000`;
} else {
    STATIC_BASE_URL = window.location.origin;
}

const API_BASE_URL = `${STATIC_BASE_URL}/api`;
console.log('API Configured:', API_BASE_URL);

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
