type ClassPrimitive = string | number | boolean | undefined | null;
type ClassValue     = ClassPrimitive | ClassPrimitive[];

export function cn(...inputs: ClassValue[]): string {
  return (inputs as ClassPrimitive[])
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('uz-UZ', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch { return iso; }
}

export function formatTime(date?: Date | null): string {
  if (!date) return '—';
  return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
