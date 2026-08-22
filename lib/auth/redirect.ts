export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function loginUrl(next?: string | null): string {
  const path = safeNextPath(next);
  if (path === "/") return "/login";
  return `/login?next=${encodeURIComponent(path)}`;
}
