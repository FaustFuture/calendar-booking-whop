// Fetcher function for SWR
export async function fetcher<T = any>(url: string): Promise<T> {
  const res = await fetch(url)
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to fetch' }))
    throw new Error(error.error || `Failed to fetch: ${res.statusText}`)
  }
  
  return res.json()
}

