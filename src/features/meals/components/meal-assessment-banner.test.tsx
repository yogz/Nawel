import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MealAssessmentBanner } from "./meal-assessment-banner";
import { type MealAssessment } from "@/lib/types";

// next-intl's useTranslations -> identity-ish translator (returns the key).
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const missingAssessment: MealAssessment = {
  sufficient: false,
  summary: "La viande est un peu juste pour 10.",
  missing: [
    { name: "Pain", suggestedQuantity: "2 baguettes", reason: "Rien de prévu" },
    { name: "Boissons", suggestedQuantity: "6 bouteilles", reason: "Pour 10 convives" },
  ],
};

describe("MealAssessmentBanner", () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("renders the summary and missing items when there is something missing", () => {
    render(<MealAssessmentBanner mealId={1} inputHash="h1" assessment={missingAssessment} />);
    expect(screen.queryByText("La viande est un peu juste pour 10.")).toBeTruthy();
    expect(screen.queryByText("Pain")).toBeTruthy();
    expect(screen.queryByText("Boissons")).toBeTruthy();
  });

  it("renders nothing when the assessment says sufficient", () => {
    render(
      <MealAssessmentBanner
        mealId={2}
        inputHash="h2"
        assessment={{ sufficient: true, summary: "Tout est là", missing: [] }}
      />
    );
    expect(screen.queryByText("Tout est là")).toBeNull();
  });

  it("renders nothing when there are no missing items", () => {
    render(
      <MealAssessmentBanner
        mealId={3}
        inputHash="h3"
        assessment={{ sufficient: false, summary: "x", missing: [] }}
      />
    );
    expect(screen.queryByText("x")).toBeNull();
  });

  it("renders nothing when there is no assessment", () => {
    render(<MealAssessmentBanner mealId={4} inputHash={null} assessment={null} />);
    expect(screen.queryByText("title")).toBeNull();
  });

  it("hides and persists dismissal when the dismiss button is clicked", () => {
    render(<MealAssessmentBanner mealId={5} inputHash="h5" assessment={missingAssessment} />);
    fireEvent.click(screen.getByRole("button", { name: "dismiss" }));
    expect(screen.queryByText("Pain")).toBeNull();
    expect(window.localStorage.getItem("meal-assessment-dismissed:5:h5")).toBe("1");
  });

  it("stays hidden on mount when this meal+hash was already dismissed", () => {
    window.localStorage.setItem("meal-assessment-dismissed:6:h6", "1");
    render(<MealAssessmentBanner mealId={6} inputHash="h6" assessment={missingAssessment} />);
    expect(screen.queryByText("Pain")).toBeNull();
  });
});
