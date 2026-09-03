import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { convertDocxToHtml, isDocxFile, isPdfFile } from "@/lib/exam/document";
import { GUIDE_BUCKET, guidePublicUrl } from "@/lib/nlxh/guides";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function NlxhGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("nlxh_guides")
    .select("id, title, storage_path, mime, original_name")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) notFound();

  const publicUrl = guidePublicUrl(data.storage_path);
  const isPdf = isPdfFile(data.original_name, data.mime);
  const isDocx = isDocxFile(data.original_name, data.mime);

  let docxHtml = "";
  if (isDocx) {
    const downloaded = await supabase.storage.from(GUIDE_BUCKET).download(data.storage_path);
    if (downloaded.error || !downloaded.data) notFound();
    const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
    docxHtml = await convertDocxToHtml(bytes);
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <p className="text-sm text-muted-foreground">{data.original_name}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/nlxh">Về lộ trình</Link>
        </Button>
      </div>
      {isPdf ? (
        <iframe
          title={data.title}
          src={publicUrl}
          className="h-[80vh] w-full rounded-xl border bg-background"
        />
      ) : isDocx ? (
        docxHtml ? (
          <article
            className="nlxh-guide-html rounded-xl border bg-card p-6 font-exam text-sm leading-7 [&_h1]:mb-3 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_table]:w-full [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1"
            dangerouslySetInnerHTML={{ __html: docxHtml }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Không đọc được nội dung DOCX.</p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Định dạng này chưa xem được trên web.{" "}
          <a className="underline" href={publicUrl}>
            Tải file
          </a>
          .
        </p>
      )}
    </div>
  );
}
