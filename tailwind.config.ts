import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // 기본 모노크롬 테마 (블랙 & 화이트)
        brand: {
          dark: "#121212",
          black: "#000000",
          white: "#ffffff",
          card: "#18181b",
          border: "#27272a",
          muted: "#71717a",
        },
        // 유채색 2가지 (당근 오렌지 + 승인/상태 그린)
        carrot: {
          DEFAULT: "#FF6F0F",
          hover: "#E85C00",
          light: "#FFF2EA",
          dark: "#C64D00",
        },
        status: {
          green: "#10B981",
          greenBg: "rgba(16, 185, 129, 0.1)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Pretendard",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
