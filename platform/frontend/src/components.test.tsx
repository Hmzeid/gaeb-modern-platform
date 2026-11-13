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

/* Phase 9 (A1/D): drawer focus management — R-C-1 */
import { Drawer } from "./components";
import { fireEvent, cleanup } from "@testing-library/react";
import { vi, afterEach } from "vitest";

describe("Drawer focus management", () => {
  afterEach(() => cleanup());
  function setup() {
    const onClose = vi.fn();
    const utils = render(
      <div>
        <button data-testid="trigger">open</button>
        <Drawer open={true} onClose={onClose} title="Record details">
          <button data-testid="first">A</button>
          <input data-testid="mid" />
          <button data-testid="last">B</button>
        </Drawer>
      </div>);
    return { onClose, ...utils };
  }
  it("moves focus into the drawer on open", () => {
    const { getByLabelText } = setup();
    expect(getByLabelText("close")).toHaveFocus();
  });
  it("wraps Tab from the last element to the first", () => {
    const { getByTestId, getByLabelText } = setup();
    getByTestId("last").focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(getByLabelText("close")).toHaveFocus();
  });
  it("wraps Shift+Tab from the first element to the last", () => {
    const { getByTestId, getByLabelText } = setup();
    getByLabelText("close").focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(getByTestId("last")).toHaveFocus();
  });
  it("closes on Escape", () => {
    const { onClose } = setup();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
  it("exposes dialog semantics and an accessible label", () => {
    const { getByRole } = setup();
    const dlg = getByRole("dialog");
    expect(dlg).toHaveAttribute("aria-modal", "true");
    expect(dlg).toHaveAttribute("aria-label", "Record details");
  });
});
