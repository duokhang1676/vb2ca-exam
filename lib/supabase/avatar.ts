export function avatarPublicUrl(
  path: string | null | undefined,
  updatedAt?: string | null,
): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const url = `${base}/storage/v1/object/public/avatars/${path}`;
  if (!updatedAt) return url;
  return `${url}?t=${encodeURIComponent(updatedAt)}`;
}
