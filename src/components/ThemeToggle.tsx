"use client";
/** Light/dark toggle. Reads the theme the layout script already applied, so
 *  it renders in sync with no flash; click flips + persists it. */
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { currentTheme, toggleTheme, type Theme } from "@/lib/theme";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync to the pre-paint theme on mount (browser-only value).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(currentTheme());
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-inksoft transition hover:border-ink hover:text-ink ${className}`}
    >
      {/* Before mount, render nothing icon-wise to avoid a mismatch flash. */}
      {mounted && (isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
    </button>
  );
}
