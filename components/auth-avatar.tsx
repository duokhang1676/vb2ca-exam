import Image from "next/image";

export function AuthAvatar({
  url,
  name,
  size = 32,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        unoptimized
      />
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}
