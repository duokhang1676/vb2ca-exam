import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Image
            src="/logo.svg"
            alt="Ôn thi VB2CA"
            width={32}
            height={32}
            className="size-8 rounded-lg object-cover"
            unoptimized
            priority
          />
          Ôn thi VB2CA
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/bank" className="text-muted-foreground hover:text-foreground">
            Ngân hàng câu hỏi
          </Link>
          <p className="hidden text-muted-foreground sm:block">
            Nghị luận 30đ · Trắc nghiệm 70đ · 150 phút
          </p>
        </nav>
      </div>
    </header>
  );
}
