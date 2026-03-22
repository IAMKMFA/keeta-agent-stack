const base = process.env.NEXT_PUBLIC_API_URL;

export async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  if (!base) return fallback;
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}${path}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
