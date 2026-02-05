/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./apps/extension/index.html",
    "./apps/extension/src/**/*.{js,ts,jsx,tsx}",
    "./apps/dashboard/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}