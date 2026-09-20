import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { prominenceSeries } from "../../data/seed";
import { ProminenceChart } from "./ProminenceChart";
import { ProminenceTable } from "./ProminenceTable";

describe("ProminenceChart", () => {
  it("renders accessible labels and synchronizes keyboard year changes", async () => {
    const onYear = vi.fn();
    render(<ProminenceChart series={prominenceSeries} selectedYear={2024} onSelectedYearChange={onYear} />);
    expect(screen.getByRole("img", { name: /where furry lived/i })).toBeInTheDocument();
    const chart = screen.getByRole("group", { name: /relative prominence timeline/i }); chart.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onYear).toHaveBeenCalledWith(2023);
    await userEvent.keyboard("{End}");
    expect(onYear).toHaveBeenCalledWith(2026);
    expect(screen.getByRole("status")).toHaveTextContent(/relative prominence/i);
  });
  it("provides an equivalent labeled table", () => { render(<ProminenceTable series={prominenceSeries} />); expect(screen.getByRole("table", { name: /evidence-backed prominence series/i })).toBeInTheDocument(); expect(screen.getAllByText(/nonliteral/i).length).toBeGreaterThan(0); });
});

