"use client";

import { Input } from "@/components/ui/input";

// One-time date entry for a bulk-upload session — entered once and reused
// for every file sorted during the session (specs/015-multi-upload-drag-sort),
// now a single exact date instead of a start/end range
// (specs/018-per-photo-dates — replaces UploadDateRangePicker.tsx). The
// parent page owns the default-to-today value.
export function UploadDatePicker({
  date,
  onChange,
}: {
  date: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-card/40 p-4">
      <label className="text-sm font-medium" htmlFor="upload-date">
        วันที่ของไฟล์ที่จะอัปโหลด
      </label>
      <Input
        id="upload-date"
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        className="w-fit"
      />
    </div>
  );
}
