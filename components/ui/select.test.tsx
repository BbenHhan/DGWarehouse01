/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Fixture({ busy }: { busy?: boolean }) {
  return (
    <Select value="todo">
      <SelectTrigger busy={busy} aria-label="สถานะ">
        <SelectValue>ยังไม่เริ่ม</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todo">ยังไม่เริ่ม</SelectItem>
      </SelectContent>
    </Select>
  );
}

// Queried through each render's own container rather than the document, so a
// trigger left behind by an earlier test cannot be the one under assertion.
function triggerIn(container: HTMLElement) {
  const trigger = container.querySelector('[data-slot="select-trigger"]');
  if (!trigger) throw new Error("no select trigger rendered");
  return trigger as HTMLElement;
}

describe("SelectTrigger busy", () => {
  it("shows the chevron when it is not busy", () => {
    const { container } = render(<Fixture />);
    const icon = triggerIn(container).querySelector("svg");
    expect(icon?.getAttribute("class")).not.toContain("animate-spin");
  });

  it("replaces the chevron with the spinner when busy", () => {
    const { container } = render(<Fixture busy />);
    const icon = triggerIn(container).querySelector("svg");
    expect(icon?.getAttribute("class")).toContain("animate-spin");
  });

  it("keeps a single icon in the slot, so the trigger does not grow", () => {
    const { container, rerender } = render(<Fixture />);
    expect(triggerIn(container).querySelectorAll("svg")).toHaveLength(1);

    rerender(<Fixture busy />);
    expect(triggerIn(container).querySelectorAll("svg")).toHaveLength(1);
  });
});
