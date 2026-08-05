// Line-art SVG icons from the reference design (styles.css `.feature svg`).
// Fixed artwork, not admin-editable — the admin only picks which one + the caption text.
export const FEATURE_ICONS = {
    design: () => (
        <svg viewBox="0 0 120 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M18 24 38 12l20 12-20 12zM18 24v28l20 12 20-12V24M38 36v28M58 24l22-13 22 13-22 13zM58 24v28l22 13 22-13V24M80 37v28M38 64l20 12 22-11" /></g></svg>
    ),
    quality: () => (
        <svg viewBox="0 0 120 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><ellipse cx="60" cy="50" rx="34" ry="15" /><ellipse cx="60" cy="50" rx="22" ry="9" /><path d="M26 50c0-25 15-40 34-40s34 15 34 40-15 40-34 40-34-15-34-40Z" /><path d="M60 10v80M42 15l13 75M78 15 65 90M31 29l57 42M31 71l57-42" /></g></svg>
    ),
    price: () => (
        <svg viewBox="0 0 120 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M18 58 54 22l48 20-36 36zM25 66 61 30l41 17-36 36zM34 75 70 39l32 13-36 36z" /><path d="m22 51 10 4m-2-14 10 4m-1-14 10 4m-1-14 10 4m11 12 10 4M59 47l10 4M49 57l10 4M39 67l10 4" /></g></svg>
    ),
} as const;

export type FeatureIconKey = keyof typeof FEATURE_ICONS;
