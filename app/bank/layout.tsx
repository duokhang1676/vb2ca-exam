import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ngân hàng câu hỏi",
};

export default function BankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
