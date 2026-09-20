import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineScrubber } from "./TimelineScrubber";

test("moves one year with explicit previous and next controls", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<TimelineScrubber min={1994} max={2026} value={2008} onChange={onChange} />);
  await user.click(screen.getByRole("button", { name: "Next year" }));
  expect(onChange).toHaveBeenCalledWith(2009);
});

