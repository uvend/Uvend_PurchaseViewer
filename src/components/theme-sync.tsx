"use client";

import { useEffect } from "react";
import { applyTheme, readTheme } from "@/lib/theme";

export function ThemeSync() {
  useEffect(() => {
    applyTheme(readTheme());
  }, []);

  return null;
}
