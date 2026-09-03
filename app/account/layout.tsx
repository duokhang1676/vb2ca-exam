import { AccountTabs } from "@/components/account-tabs";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tài khoản</h1>
        <p className="text-sm text-muted-foreground">
          Thông tin cá nhân, bài đã làm, ôn tập và đóng góp ngân hàng.
        </p>
      </div>
      <AccountTabs />
      {children}
    </div>
  );
}
