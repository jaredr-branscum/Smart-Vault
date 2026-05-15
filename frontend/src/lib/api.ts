/**
 * Centralized API configuration and utilities.
 * Ensures consistent endpoint resolution across the application and simplifies
 * environment-specific deployments.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Helper to ensure consistent Authorization header formatting.
 */
export const getAuthHeaders = (token: string | null) => {
  if (!token) return {};
  return {
    'Authorization': `Bearer ${token}`
  };
};
