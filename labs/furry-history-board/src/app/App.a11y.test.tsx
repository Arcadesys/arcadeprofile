import axe from "axe-core";
import { render } from "@testing-library/react";
import { App } from "./App";
import { ThemeProvider } from "../features/theme/ThemeProvider";

test("has no automatically detectable accessibility violations", async () => {
  const { container } = render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );

  const result = await axe.run(container, {
    rules: {
      "color-contrast": { enabled: false },
    },
  });

  expect(result.violations).toEqual([]);
});

