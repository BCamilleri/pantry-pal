import type { Config } from "tailwindcss";


export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        darkgrey: "#3c3c3c",
        deepred: "#ba1200",
        myorange: "#f18f01",
        myblue: "#2081c3",
        //lightgrey: "#cfcfcf"
        lightgrey: "#f0f5f5"
      },
    },
  },
  plugins: [],
} satisfies Config;
