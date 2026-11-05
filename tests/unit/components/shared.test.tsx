import { render, screen } from "@testing-library/react";
import { HandHeart } from "lucide-react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/shared/empty-state";
import { FormAlert, FormField } from "@/components/shared/form-field";

describe("FormField", () => {
  it("relie le libellé, l'aide et l'erreur au champ", () => {
    render(<FormField name="email" label="Adresse email" hint="Aide" error="Adresse invalide" />);
    const input = screen.getByLabelText("Adresse email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Aide Adresse invalide");
  });

  it("n'indique pas d'erreur sans message", () => {
    render(<FormField name="nom" label="Nom" />);
    expect(screen.getByLabelText("Nom")).not.toHaveAttribute("aria-invalid");
  });
});

describe("FormAlert", () => {
  it("annonce une erreur avec role=alert", () => {
    render(<FormAlert message="Email ou mot de passe incorrect." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect.");
  });
  it("annonce un succès avec role=status", () => {
    render(<FormAlert tone="success" message="Mot de passe modifié." />);
    expect(screen.getByRole("status")).toHaveTextContent("Mot de passe modifié.");
  });
});

describe("EmptyState", () => {
  it("affiche un titre, un texte et un verset, icône masquée aux lecteurs d'écran", () => {
    const { container } = render(<EmptyState icon={HandHeart} title="Titre" body="Texte" verse="— Galates 6:2" />);
    expect(screen.getByRole("heading", { name: "Titre" })).toBeInTheDocument();
    expect(screen.getByText("— Galates 6:2")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
