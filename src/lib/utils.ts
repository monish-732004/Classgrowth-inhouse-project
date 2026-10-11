import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getTheme() {
  if (typeof window !== "undefined") {
    const theme = localStorage.getItem("theme");
    if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      return "dark";
    }else{
      return "light";
    }
  }
}
function setTheme(theme: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("theme", theme);
  }
}

function applyTheme(theme: string) {
  if (typeof window !== "undefined") {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

export {getTheme,setTheme, applyTheme};