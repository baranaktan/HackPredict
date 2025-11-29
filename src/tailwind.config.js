/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Profile page colors
                periwinkle: '#3b82f6', // Section backgrounds (blue)
                coral: '#93c5fd', // Stats cards background (light blue)
                lavender: '#dbeafe', // Blue-100 equivalent
                plum: '#1e3a8a', // Blue-900 equivalent
                cream: '#f0f9ff', // Light blue-ish white
                eggshell: '#fefce8', // Yellow-50 equivalent
                butter: '#fef08a', // Yellow-200 equivalent
                gold: '#facc15', // Yellow-400 equivalent
                sage: '#dcfce7', // Green-200 equivalent
                forest: '#166534', // Green-900 equivalent
                slate: '#e2e8f0', // Gray-200 equivalent
                charcoal: '#1f2937', // Gray-900 equivalent
                steel: '#374151', // Gray-800 equivalent
                rust: '#fecaca', // Red-200 equivalent
                burgundy: '#7f1d1d', // Red-900 equivalent
                sky: '#bfdbfe', // Blue-200 equivalent
                navy: '#1e3a8a', // Blue-900 equivalent
                mauve: '#dbeafe', // Blue-100 equivalent
                fuchsia: '#2563eb', // Blue-600 equivalent
            },
            animation: {
                'bounce-once': 'bounce 0.6s ease-in-out 1',
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'blink-effect': 'blinkEffect 0.3s ease-out',
                'lightning-flash': 'lightningFlash 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                blinkEffect: {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '50%': { transform: 'scale(1.3)', opacity: '0.7' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                lightningFlash: {
                    '0%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0px #3b82f6' },
                    '20%': { transform: 'scale(1.2)', opacity: '1', boxShadow: '0 0 20px #3b82f6' },
                    '50%': { transform: 'scale(0.95)', opacity: '0.8', boxShadow: '0 0 10px #3b82f6' },
                    '70%': { transform: 'scale(1.05)', opacity: '1', boxShadow: '0 0 15px #3b82f6' },
                    '100%': { transform: 'scale(1)', opacity: '1', boxShadow: '0 0 0px #3b82f6' },
                },
            },
        },
    },
    plugins: [],
}