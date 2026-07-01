import { FileText } from "lucide-react";
import type { Document } from "@/lib/types";
import { publicFileUrl } from "@/lib/storage";

export function DocList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p>ยังไม่มีเอกสารในหมวดนี้</p>
        <p className="text-sm">อัปโหลดเอกสารแรกของคุณด้านล่าง</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border">
      {documents.map((doc) => (
        <li key={doc.id}>
          <a
            href={publicFileUrl("documents", doc.storage_path)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-3 hover:bg-accent"
          >
            <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{doc.file_name}</p>
              {doc.note && (
                <p className="truncate text-xs text-muted-foreground">{doc.note}</p>
              )}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
