import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusChip, StageStepper, SegBar } from "./components";
import { T } from "./i18n";

const tEn = T.en;

describe("StatusChip", () => {
  it("renders the localized label with the ok tone for paid", () => {
    const { container } = render(<StatusChip s="paid" t={tEn} />);
    expect(screen.getByText(T.en.st_paid)).toBeInTheDocument();
    expect(container.querySelector(".st")).toHaveClass("ok");
  });
  it("uses the bad tone for failed and the info tone for certified", () => {
    const { container, rerender } = render(<StatusChip s="FAILED" t={tEn} />);
    expect(container.querySelector(".st")).toHaveClass("bad");
    rerender(<StatusChip s="certified" t={tEn} />);
    expect(container.querySelector(".st")).toHaveClass("info");
  });
  it("never crashes on a missing enum value (approvals regression)", () => {
    const { container } = render(<StatusChip s={undefined} t={tEn} />);
    expect(container.querySelector(".st")).toHaveTextContent("—");
  });
  it("humanizes unknown statuses instead of rendering a raw key", () => {
    render(<StatusChip s="some_new_state" t={tEn} />);
    expect(screen.getByText("some new state")).toBeInTheDocument();
  });
});

describe("StageStepper", () => {
  it("marks stages before current as done and current as current", () => {
    const { container } = render(<StageStepper stages={["draft", "certified", "billed", "paid"]} current="billed" t={tEn} />);
    const steps = container.querySelectorAll(".step");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveClass("done");
    expect(steps[1]).toHaveClass("done");
    expect(steps[2]).toHaveClass("now");
    expect(steps[3]).not.toHaveClass("done");
  });
  it("handles an unknown current stage without marking anything current", () => {
    const { container } = render(<StageStepper stages={["draft", "paid"]} current="mystery" t={tEn} />);
    expect(container.querySelectorAll(".step.now")).toHaveLength(0);
  });
});

describe("SegBar", () => {
  it("renders proportional segments that sum to the full width", () => {
    const { container } = render(<SegBar parts={[{ pct: 25, color: "#111" }, { pct: 75, color: "#222" }]} />);
    const segs = container.querySelectorAll(".seg i");
    expect(segs).toHaveLength(2);
    expect((segs[0] as HTMLElement).style.width).toBe("25%");
    expect((segs[1] as HTMLElement).style.width).toBe("75%");
  });
  it("renders an empty track for all-zero parts", () => {
    const { container } = render(<SegBar parts={[{ pct: 0, color: "#111" }]} />);
    expect(container.querySelector(".seg")).toBeInTheDocument();
  });
});
