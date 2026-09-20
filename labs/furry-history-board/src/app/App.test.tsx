import { render, screen } from "@testing-library/react";
import { App } from "./App";
import { ThemeProvider } from "../features/theme/ThemeProvider";

test("renders the foundation shell and exact lens labels", () => {
  render(<ThemeProvider><App /></ThemeProvider>);
  expect(screen.getByRole("heading", { name: "Furry History Board" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Internet" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Publishing" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Conventions" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "People" })).toBeInTheDocument();
});

