import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryBar } from "./QueryBar";

test("submits one parsed snapshot atomically", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  render(<QueryBar onSubmit={onSubmit} />);
  const input = screen.getByLabelText("Ask furry history anything");
  await user.type(input, "Internet 2008");
  expect(onSubmit).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: /Explore history/ }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ lens: "Internet", yearStart: 2008, yearEnd: 2008 });
});

