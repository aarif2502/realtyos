import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        mist: "#F3F7FB",
        cloud: "#E6EDF6",
        accent: "#67A6FF",
        accentSoft: "#DCEAFF",
      },
      boxShadow: {
        panel: "0 24px 60px rgba(15, 23, 42, 0.08)",
        card: "0 20px 50px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["SF Pro Display", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        windowReveal: {
          "0%": {
            opacity: "0",
            transform: "perspective(1600px) translateY(28px) scale(0.985) rotateX(4deg)",
          },
          "100%": {
            opacity: "1",
            transform: "perspective(1600px) translateY(0) scale(1) rotateX(0deg)",
          },
        },
      },
      animation: {
        rise: "rise 0.35s ease-out",
        windowReveal: "windowReveal 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
