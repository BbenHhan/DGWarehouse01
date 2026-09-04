/** @vitest-environment jsdom */
import "../../vitest.setup.dom";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingRegion, PageHeaderSkeleton, RowsSkeleton, TabBarSkeleton } from "@/components/ui/skeleton";

describe("loading screens", () => {
  it("announces what is loading, since the shapes themselves say nothing", () => {
    render(
      <LoadingRegion label="กำลังโหลดรายการเอกสาร">
        <PageHeaderSkeleton />
      </LoadingRegion>
    );

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("กำลังโหลดรายการเอกสาร")).toBeInTheDocument();
  });

  it("keeps the placeholder blocks out of the accessibility tree", () => {
    const { container } = render(<PageHeaderSkeleton />);
    const blocks = container.querySelectorAll("[aria-hidden='true']");
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("draws as many rows as asked for, so the shape matches the page", () => {
    const { container } = render(<RowsSkeleton count={6} />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(6);
  });

  it("draws a pill per tab", () => {
    const { container } = render(<TabBarSkeleton count={5} />);
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(5);
  });
});
