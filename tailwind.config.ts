import type { Config } from "tailwindcss";
import type { PluginAPI } from "tailwindcss/types/config";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        handdrawn: ["'Patrick Hand'", "'Gloria Hallelujah'", "cursive"],
        sans: ["'Patrick Hand'", "'Gloria Hallelujah'", "cursive"]
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      boxShadow: {
        sketch: "12px 12px 0 0 rgba(21, 21, 21, 0.6)",
        "sketch-soft": "8px 8px 0 0 rgba(21, 21, 21, 0.35)"
      },
      borderRadius: {
        sm: "var(--radius)",
        DEFAULT: "var(--radius)",
        lg: "calc(var(--radius) * 1.5)"
      }
    }
  },
  plugins: [
  plugin(function ({ addUtilities }: PluginAPI) {
      addUtilities({
        ".sketch-shadow": {
          boxShadow: "6px 6px 0 0 rgba(0,0,0,0.55)"
        },
        ".sketch-shadow-soft": {
          boxShadow: "6px 6px 0 0 rgba(0,0,0,0.25)"
        }
      });
    })
  ]
};

export default config;
