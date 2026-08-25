"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Palette, Sparkles, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type ThemeMode = "light" | "dark" | "minimal" | "pixel";

const THEME_STORAGE_KEY = "dg-theme";
const DEFAULT_THEME: ThemeMode = "minimal";

const MODES: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
  { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
  { value: "minimal", label: "Minimal", icon: <Sparkles className="h-4 w-4" /> },
  { value: "pixel", label: "Pixel", icon: <Palette className="h-4 w-4" /> },
];

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
  document.documentElement.classList.toggle("dark", mode === "dark");
}

// Sits to the left of AccountMenu in the header (spec FR-003). Four modes,
// applied instantly to the whole document (every component already resolves
// its colors from the same CSS variables — specs/033-multi-theme-system
// research.md Decision 1), persisted per-device in localStorage. The actual
// default-on-first-visit and no-flash guarantee come from the inline script
// in app/layout.tsx, which already runs before this component mounts — this
// component only needs to mirror whatever data-theme is already on <html>.
export function ThemeSwitcher() {
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_THEME);

  useEffect(() => {
    const current = document.documentElement.dataset.theme as ThemeMode | undefined;
    if (current) setMode(current);
  }, []);

  function handleSelect(next: ThemeMode) {
    setMode(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private mode, etc.) — the choice just
      // won't persist across reloads, still applies for this page view.
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" size="icon" aria-label="เปลี่ยนธีม">
            <Palette className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {MODES.map((option) => (
            <DropdownMenuItem key={option.value} onClick={() => handleSelect(option.value)}>
              {option.icon}
              {option.label}
              {mode === option.value && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
