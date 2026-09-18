/** @vitest-environment jsdom */
import "../vitest.setup.dom";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GroupRequirement } from "@/lib/types";

const { GroupRequirements } = await import("@/components/GroupRequirements");

// specs/046-subgroup-requirement-checklist US1.

// Names carry no digits, so the no-tally check below cannot be fooled by an
// item's own name.
const NAMES = ["หนึ่ง", "สเปกพัดลม", "ใบรับรองประตู", "ผลทดสอบ", "แบบแปลน"];

function item(n: number, overrides: Partial<GroupRequirement> = {}): GroupRequirement {
  return {
    id: `req-${n}`,
    group_id: "grp-1",
    name_th: NAMES[n % NAMES.length],
    status: "missing",
    note: null,
    sort_order: n,
    ...overrides,
  };
}

describe("reading a sub-group's requirements", () => {
  it("shows the description and every item in order", () => {
    render(
      <GroupRequirements
        description="ใบรับรองของวัสดุที่ติดตั้งจริง"
        items={[item(1, { name_th: "สเปกพัดลม" }), item(2, { name_th: "ใบรับรอง Emergency Shower" })]}
      />
    );

    expect(screen.getByText("ใบรับรองของวัสดุที่ติดตั้งจริง")).toBeInTheDocument();
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("สเปกพัดลม"),
      expect.stringContaining("ใบรับรอง Emergency Shower"),
    ]);
  });

  // FR-005: an item's state must survive being printed in black and white.
  it("names each status in Thai rather than relying on colour", () => {
    render(
      <GroupRequirements
        items={[
          item(1, { status: "have" }),
          item(2, { status: "missing" }),
          item(3, { status: "waiting" }),
        ]}
      />
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("มีแล้ว");
    expect(rows[1]).toHaveTextContent("ยังขาด");
    expect(rows[2]).toHaveTextContent("รอดำเนินการ");
  });

  it("shows an item's note beside it", () => {
    render(<GroupRequirements items={[item(1, { status: "waiting", note: "รอทำสายล่อฟ้าเสร็จก่อน" })]} />);
    expect(within(screen.getByRole("listitem")).getByText("รอทำสายล่อฟ้าเสร็จก่อน")).toBeInTheDocument();
  });

  it("shows a description on its own without an empty list", () => {
    render(<GroupRequirements description="ผลวัดองศาพื้น" items={[]} />);
    expect(screen.getByText("ผลวัดองศาพื้น")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  // FR-007: a sub-group nobody has described must look exactly as before.
  it("renders nothing at all when there is neither description nor items", () => {
    const { container } = render(<GroupRequirements items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  // FR-006: the account holder asked for the items, not a tally of them.
  it("never shows a count of items by status", () => {
    const { container } = render(
      <GroupRequirements
        description="คำอธิบาย"
        items={[item(1, { status: "have" }), item(2), item(3), item(4, { status: "waiting" })]}
      />
    );
    // Nothing in the fixture contains a digit, so any digit on the page is a
    // number the component invented — which is exactly what FR-006 forbids.
    expect(container.textContent ?? "").not.toMatch(/\d/);
  });
});
