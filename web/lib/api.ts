/**
 * API Client for connecting to Axobase backend
 */

import { PopulationStats } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchStats(): Promise<PopulationStats | null> {
  try {
    // Try to fetch from real backend
    const response = await fetch(`${API_URL}/api/stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch {
    // Backend not available
    return null;
  }
}

export async function fetchAgents(): Promise<any[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/agents`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch {
    return null;
  }
}

export async function controlSimulation(action: 'start' | 'stop' | 'reset'): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
