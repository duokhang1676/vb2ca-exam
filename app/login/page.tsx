import { LoginForm } from "@/components/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeNextPath } from "@/lib/auth/redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
          <CardDescription>
            Cần tài khoản để tạo bài thi, làm bài và đóng góp ngân hàng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm nextPath={safeNextPath(next)} />
        </CardContent>
      </Card>
    </div>
  );
}
