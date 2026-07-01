import Link from "next/link";

export function TopNav() {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 p-4">
        <span className="text-sm font-semibold">DG Warehouse 01</span>
        <nav className="flex gap-2">
          <Link href="/photos" className="rounded-md px-3 py-1.5 text-sm hover:bg-accent">
            📸 รูปภาพ
          </Link>
          <Link href="/documents" className="rounded-md px-3 py-1.5 text-sm hover:bg-accent">
            📄 เอกสาร
          </Link>
        </nav>
      </div>
    </header>
  );
}
