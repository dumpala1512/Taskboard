import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        background: "var(--zs-page-bg)",
        foreground: "var(--zs-text-primary)",
        /* Zoho Sprints palette */
        zs: {
          primary:       "#1E88E5",
          "primary-hover":"#1876C4",
          "primary-light":"#E3F2FD",
          teal:          "#26A69A",
          "page-bg":     "#F5F6F8",
          surface:       "#FFFFFF",
          "surface-alt": "#FAFBFC",
          border:        "#E0E3E8",
          "text-primary":"#33475B",
          "text-secondary":"#6E7B8B",
          "text-muted":  "#9EAAB7",
          /* status */
          todo:          "#9E9E9E",
          inprogress:    "#2196F3",
          review:        "#7B61FF",
          done:          "#43A047",
          blocked:       "#E53935",
          onhold:        "#FB8C00",
        },
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "14px",
      },
      boxShadow: {
        "zs-sm":   "0 1px 3px rgba(0,0,0,0.06)",
        "zs-md":   "0 2px 8px rgba(0,0,0,0.10)",
        "zs-lg":   "0 4px 20px rgba(0,0,0,0.12)",
        "zs-card": "0 1px 3px rgba(0,0,0,0.06)",
        "zs-card-hover": "0 2px 8px rgba(0,0,0,0.10)",
        "zs-drag": "0 4px 14px rgba(30,136,229,0.18)",
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '18px' }],
        'sm': ['13px', { lineHeight: '20px' }],
        'base': ['14px', { lineHeight: '22px' }],
        'lg': ['16px', { lineHeight: '24px' }],
        'xl': ['18px', { lineHeight: '28px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['22px', { lineHeight: '30px' }],
        '4xl': ['24px', { lineHeight: '32px' }],
        '5xl': ['30px', { lineHeight: '38px' }],
      },
    },
  },
  plugins: [],
};
export default config;
