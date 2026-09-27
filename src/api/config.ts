/**
 * Global API Configuration for ThermoShelter.
 *
 * In production builds (e.g. Vercel deployment):
 * - Uses VITE_API_BASE_URL or VITE_BACKEND_URL if set in the hosting environment.
 * - Automatically falls back to the live production Railway backend URL:
 *   https://sih26051celestialz-production.up.railway.app
 *
 * In local development (`npm run dev`):
 * - Uses VITE_API_BASE_URL from .env if defined.
 * - Defaults to http://localhost:8000 for local FastAPI testing.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'https://sih26051celestialz-production.up.railway.app';
