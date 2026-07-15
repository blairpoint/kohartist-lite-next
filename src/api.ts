const getHeaders = (headers: Record<string, string> = {}) => {
  const token = localStorage.getItem('kohartist_token');
  const result: Record<string, string> = { ...headers };
  if (token) {
    result['Authorization'] = `Bearer ${token}`;
  }
  return result;
};

export const api = {
  get: async (url: string) => {
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  post: async (url: string, body: any) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  put: async (url: string, body: any) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },
  delete: async (url: string) => {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }
};

