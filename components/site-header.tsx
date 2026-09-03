import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AuthNav } from "@/components/auth-nav";
import { Button } from "@/components/ui/button";
import { getAuthUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const user = await getAuthUser();
  return (
    <header className="border-b bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Image
            src="/logo.png"
            alt="Ôn thi VB2CA"
            width={32}
            height={32}
            className="size-8 rounded-lg object-cover"
            unoptimized
            priority
          />
          Ôn thi VB2CA
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/nlxh">Luyện nghị luận</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/bank">Ngân hàng câu hỏi</Link>
              </Button>
              <p className="hidden text-muted-foreground sm:block">
                Nghị luận 30đ · Trắc nghiệm 70đ · 150 phút
              </p>
            </>
          ) : null}
          <Suspense
            fallback={
              user ? (
                <Button size="sm" disabled>
                  Đăng nhập
                </Button>
              ) : null
            }
          >
            <AuthNav />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
