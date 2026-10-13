// Smoke tests: every route must still render. Catches pages broken by unrelated changes.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

const renderAt = (path, user = null) => {
  if (user) localStorage.setItem("user", JSON.stringify(user));
  window.history.pushState({}, "", path);
  return render(<App />);
};

const demoUser = { name: "Usuario Demo", email: "demo@example.com", picture: "https://example.com/a.png" };

describe("App routes", () => {
  it("/ renders the dashboard and the login button", () => {
    renderAt("/");
    expect(screen.getByAltText("DocManager Logo")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Login with Google/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Let's Work Together/)).toBeInTheDocument();
  });

  it("/legal renders the privacy policy", () => {
    renderAt("/legal");
    expect(screen.getByRole("heading", { level: 1, name: /Política de Privacidad/ })).toBeInTheDocument();
  });

  it("/admin/xml-to-excel asks to log in when there is no session", () => {
    renderAt("/admin/xml-to-excel");
    expect(screen.getByRole("heading", { name: /Please log in/ })).toBeInTheDocument();
  });

  it("/admin/xml-to-excel renders the tool for a logged-in user", () => {
    const { container } = renderAt("/admin/xml-to-excel", demoUser);
    expect(screen.getByRole("heading", { name: "Convertir XML a Excel" })).toBeInTheDocument();
    expect(screen.getByText("Usuario Demo")).toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/xml-to-excel"]')).toBeInTheDocument();
  });

  it("legacy /xml-to-excel route still works", () => {
    renderAt("/xml-to-excel", demoUser);
    expect(screen.getByRole("heading", { name: "Convertir XML a Excel" })).toBeInTheDocument();
  });
});
