/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                },
                // Node Builder Toolbar & Inspector Modernization — additive `nb`
                // namespace, backed by the CSS custom properties in theme.css.
                nb: {
                    bg: 'var(--nb-bg)',
                    'bg-subtle': 'var(--nb-bg-subtle)',
                    border: 'var(--nb-border)',
                    text: 'var(--nb-text)',
                    'text-muted': 'var(--nb-text-muted)',
                    accent: 'var(--nb-accent)',
                },
            },
            borderRadius: {
                nb: 'var(--nb-radius)',
                'nb-sm': 'var(--nb-radius-sm)',
            },
            height: {
                control: 'var(--nb-control-h)',
                'control-lg': 'var(--nb-control-h-lg)',
            },
        },
    },
    plugins: [require('@tailwindcss/forms')],
}
