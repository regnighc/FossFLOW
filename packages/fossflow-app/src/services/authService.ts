const API_BASE = '/api';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  quota: number;
}

export interface DiagramMeta {
  id: string;
  name: string;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  manual_saved_at: string | null;
}

function getToken(): string | null {
  return localStorage.getItem('fossflow-token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiCall(method: string, path: string, body?: unknown): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  return res;
}

export const authService = {
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await apiCall('POST', '/auth/login', { username, password });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async register(username: string, email: string, password: string, inviteToken?: string): Promise<{ token: string; user: User }> {
    const res = await apiCall('POST', '/auth/register', { username, email, password, inviteToken });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async me(): Promise<User> {
    const res = await apiCall('GET', '/auth/me');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Not authenticated');
    return data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await apiCall('POST', '/auth/change-password', { currentPassword, newPassword });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
  },

  async getSignupInfo(): Promise<{ mode: 'open' | 'invite' }> {
    const res = await fetch(`${API_BASE}/auth/signup-info`);
    return res.json();
  },

  async checkInviteToken(token: string): Promise<{ valid: boolean; email: string }> {
    const res = await fetch(`${API_BASE}/auth/invite-check?token=${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error('Invalid or expired invitation');
    return res.json();
  },

  // Diagrams
  async listDiagrams(): Promise<DiagramMeta[]> {
    const res = await apiCall('GET', '/diagrams');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load diagrams');
    return data;
  },

  async getDiagram(id: string): Promise<unknown> {
    const res = await apiCall('GET', `/diagrams/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load diagram');
    return data;
  },

  async saveDiagram(name: string, diagramData: unknown, thumbnail: string | null, id?: string): Promise<{ id: string }> {
    if (id) {
      const res = await apiCall('PUT', `/diagrams/${id}`, { name, thumbnail, isManualSave: true, ...(diagramData as object) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      return { id };
    } else {
      const res = await apiCall('POST', '/diagrams', { name, thumbnail, ...(diagramData as object) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      return data;
    }
  },

  async autoSaveDiagram(id: string, name: string, diagramData: unknown, thumbnail: string | null): Promise<void> {
    await apiCall('PUT', `/diagrams/${id}`, { name, thumbnail, ...(diagramData as object) });
  },

  async updateThumbnail(id: string, thumbnail: string | null): Promise<void> {
    await apiCall('PATCH', `/diagrams/${id}/thumbnail`, { thumbnail });
  },

  async deleteDiagram(id: string): Promise<void> {
    const res = await apiCall('DELETE', `/diagrams/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete');
  },

  async getQuota(): Promise<{ used: number; total: number }> {
    const res = await apiCall('GET', '/user/quota');
    return res.json();
  },

  // Admin
  async adminGetUsers(): Promise<unknown[]> {
    const res = await apiCall('GET', '/admin/users');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  },

  async adminUpdateUser(id: string, updates: { quota?: number; active?: boolean; role?: string; password?: string }): Promise<void> {
    const res = await apiCall('PUT', `/admin/users/${id}`, updates);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
  },

  async adminDeleteUser(id: string): Promise<void> {
    const res = await apiCall('DELETE', `/admin/users/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
  },

  async adminGetSettings(): Promise<{ signup_mode: string }> {
    const res = await apiCall('GET', '/admin/settings');
    return res.json();
  },

  async adminUpdateSettings(settings: { signup_mode: string }): Promise<void> {
    const res = await apiCall('PUT', '/admin/settings', settings);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
  },

  async adminGetSmtp(): Promise<unknown> {
    const res = await apiCall('GET', '/admin/smtp');
    return res.json();
  },

  async adminUpdateSmtp(cfg: unknown): Promise<void> {
    const res = await apiCall('PUT', '/admin/smtp', cfg);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
  },

  async adminTestSmtp(): Promise<void> {
    const res = await apiCall('POST', '/admin/smtp/test', {});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
  },

  async adminGetInvites(): Promise<unknown[]> {
    const res = await apiCall('GET', '/admin/invites');
    return res.json();
  },

  async adminSendInvite(email: string): Promise<{ token: string; emailSent: boolean; emailError?: string }> {
    const res = await apiCall('POST', '/admin/invites', { email });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  },

  async adminDeleteInvite(id: string): Promise<void> {
    await apiCall('DELETE', `/admin/invites/${id}`);
  }
};
