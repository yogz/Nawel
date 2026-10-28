import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AlreadyBoughtToggle } from "./already-bought-toggle";

describe("AlreadyBoughtToggle", () => {
  afterEach(cleanup);

  it("affiche le libellé et l'aide prévus", () => {
    render(<AlreadyBoughtToggle checked={false} onChange={() => {}} />);
    expect(screen.getByLabelText(/J.ai déjà les billets/)).toBeTruthy();
    expect(
      screen.getByText(/Personne n.est invité à répondre\. Tu indiques qui vient, puis le prix\./)
    ).toBeTruthy();
  });

  it("signale le changement", () => {
    const onChange = vi.fn();
    render(<AlreadyBoughtToggle checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/J.ai déjà les billets/));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
