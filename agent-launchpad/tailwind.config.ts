import type { Config } from "tailwindcss";

const config = {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
		"*.{js,ts,jsx,tsx,mdx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: "2rem",
			screens: {
				"2xl": "1400px",
			},
		},
		extend: {
			colors: {
				// new gradient stops
				"gradient-start": "#020817",
				"gradient-mid1": "#11365E",
				"gradient-mid2": "#408B7C",
				// -- you already have success (#BCFCAF) and offwhite (#F4FFF4)
				success: "hsl(var(--success))",
				"success-600": "hsl(var(--success-600))",
				"green-800": "hsl(var(--green-800))",
				"green-900": "hsl(var(--green-900))",
				pink: "hsl(var(--pink))",
				purple: "hsl(var(--purple))",
				"purple-800": "hsl(var(--purple-800))",
				offwhite: "hsl(var(--offwhite))",
				grey: "hsl(var(--grey))",
				"grey-800": "hsl(var(--grey-800))",
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
			},
			backgroundImage: {
				"main-gradient":
					"linear-gradient(0deg, #020817 0%, #11365E 16.92%, #408B7C 32.39%, #BCFCAF 63.75%, #F4FFF4 100%)",
			},
			/* 4px grid spacing scale */
			spacing: {
				1: "0.25rem" /* 4px  */,
				2: "0.5rem" /* 8px  */,
				3: "0.75rem" /* 12px */,
				4: "1rem" /* 16px */,
				5: "1.25rem" /* 20px */,
				6: "1.5rem" /* 24px */,
				8: "2rem" /* 32px */,
				10: "2.5rem" /* 40px */,
				11: "2.75rem" /* 44px */,
				12: "3rem" /* 48px */,
				13: "3.25rem" /* 52px */,
				14: "3.5rem" /* 56px */,
				15: "3.75rem" /* 60px */,
			},
			/* font families */
			fontFamily: {
				display: ["Funnel Display", "sans-serif"],
				body: ["Inter", "sans-serif"],
			},
			/* heading & body font-sizes */
			fontSize: {
				h1: ["5.75rem", { lineHeight: "1.2" }] /* 92px */,
				h2: ["3.55rem", { lineHeight: "1.2" }] /* 56px */,
				h3: ["2.1875rem", { lineHeight: "1.2" }] /* 35px */,
				h4: ["1.5rem", { lineHeight: "1.2" }] /* 24px */,
				subtitle: ["1.5rem", { lineHeight: "1.4", fontWeight: "500" }] /* 24px */,
				body: ["1.125rem", { lineHeight: "1.4" }] /* 18px */,
			},
			/* custom color palette from Figma */
			borderRadius: {
				lg: "var(--radius)",
				md: "1.5rem",
				sm: "calc(var(--radius) - 4px)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
