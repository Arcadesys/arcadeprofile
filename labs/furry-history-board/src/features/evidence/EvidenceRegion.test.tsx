import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvidenceRegion } from "./EvidenceRegion";

test("expands evidence and closes the region with Escape", async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  render(<EvidenceRegion open items={[{ id: "a", title: "Archived pages", description: "Wayback captures", confidence: "medium" }]} onOpenChange={onOpenChange} />);
  await user.click(screen.getByRole("button", { name: /Archived pages/ }));
  expect(screen.getByText("No public link is recorded for this source.")).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.queryByText("No public link is recorded for this source.")).not.toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("labels unavailable evidence without hiding it", () => {
  render(<EvidenceRegion open items={[{ id: "a", title: "Unavailable", description: "Missing", confidence: "low", available: false }]} onOpenChange={() => undefined} />);
  expect(screen.getByText("Source unavailable")).toBeInTheDocument();
});

