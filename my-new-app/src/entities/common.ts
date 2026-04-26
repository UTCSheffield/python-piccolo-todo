import type { Dispatch, SetStateAction } from 'react';
import type { SessionResponse } from '../api/client';

export const section: React.CSSProperties = { border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, marginBottom: 16 };
export const btn: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1890ff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 };
export const inp: React.CSSProperties = { padding: '8px 10px', border: '1px solid #d9d9d9', borderRadius: 4, fontSize: 14 };
export const th: React.CSSProperties = { padding: '8px 6px', fontWeight: 600, borderBottom: '2px solid #f0f0f0', textAlign: 'left' };
export const td: React.CSSProperties = { padding: '6px', borderBottom: '1px solid #f9f9f9' };

export type PageProps = {
  session: SessionResponse;
  setError: Dispatch<SetStateAction<string | null>>;
};

export function displayFkLabel(options: Array<{ id: number; [k: string]: unknown }>, value: unknown): string {
  const hit = options.find(o => o.id === value);
  if (!hit) return String(value ?? '');
  return String(hit.name ?? hit.title ?? hit.label ?? hit.id);
}
