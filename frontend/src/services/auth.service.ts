// Before (direct port)
const BASE = 'http://localhost:3001/api/v1';

// After (works in both dev and prod via Nginx)
// const BASE = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}/api/v1`;