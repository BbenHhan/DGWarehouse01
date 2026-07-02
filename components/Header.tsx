import Link from "next/link";
import { Box, CalendarDays, FileText, Images } from "lucide-react";

function StatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {icon}
      <span className="text-foreground">{label}</span>
    </span>
  );
}

export function Header({
  stats,
}: {
  stats: { totalPhotos: number; totalDocuments: number; totalWeeks: number };
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 shadow-[0_1px_0_rgba(155,94,40,.1),0_2px_12px_rgba(0,0,0,.06)] backdrop-blur-xl supports-backdrop-filter:bg-background/70">
      <div className="h-[3px] bg-gradient-to-r from-primary to-gold" />
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/photos" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-2 text-primary-foreground shadow-[0_4px_18px_rgba(155,94,40,.35)]">
            <Box className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              DG Warehouse 01
            </span>
            <span className="text-xs text-muted-foreground">Progress Report</span>
          </span>
        </Link>

        <div className="flex flex-wrap gap-2">
          <StatChip icon={<Images className="h-3.5 w-3.5" />} label={`${stats.totalPhotos} รูป`} />
          <StatChip
            icon={<FileText className="h-3.5 w-3.5" />}
            label={`${stats.totalDocuments} เอกสาร`}
          />
          <StatChip
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label={`${stats.totalWeeks} สัปดาห์`}
          />
        </div>
      </div>
    </header>
  );
}
