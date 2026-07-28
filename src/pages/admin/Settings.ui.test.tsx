import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingField } from "./Settings";

const noopIcon = () => null;

describe("SettingField (UI)", () => {
  it("renders nothing when setting is undefined", () => {
    const { container } = render(
      <SettingField s={undefined} onUpdate={() => {}} getIcon={noopIcon} label="X" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a boolean toggle showing 'Ativado' when value is 'true'", () => {
    render(
      <SettingField
        s={{ key: "home_show_game_caixa", value: "true" }}
        onUpdate={() => {}}
        getIcon={noopIcon}
        label="Bloco: Caixa Misteriosa"
      />,
    );
    expect(screen.getByText("Ativado")).toBeInTheDocument();
    expect(screen.getByText("Bloco: Caixa Misteriosa")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "checked");
  });

  it("renders 'Desativado' when value is 'false'", () => {
    render(
      <SettingField
        s={{ key: "menu_federal_enabled", value: "false" }}
        onUpdate={() => {}}
        getIcon={noopIcon}
        label="Menu: Federal"
      />,
    );
    expect(screen.getByText("Desativado")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "unchecked");
  });

  it("calls onUpdate with the toggled string value when clicked", () => {
    const onUpdate = vi.fn();
    render(
      <SettingField
        s={{ key: "home_show_game_raspadinha", value: "true" }}
        onUpdate={onUpdate}
        getIcon={noopIcon}
        label="Bloco: Raspadinha"
      />,
    );
    fireEvent.click(screen.getByRole("switch"));
    expect(onUpdate).toHaveBeenCalledWith("home_show_game_raspadinha", "false");
  });

  it("renders a textarea for type='textarea' and reports changes", () => {
    const onUpdate = vi.fn();
    render(
      <SettingField
        s={{ key: "home_marquee_text", value: "Olá" }}
        onUpdate={onUpdate}
        getIcon={noopIcon}
        label="Texto"
        type="textarea"
      />,
    );
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "Novo texto" } });
    expect(onUpdate).toHaveBeenCalledWith("home_marquee_text", "Novo texto");
  });
});