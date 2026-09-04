// src/modules/cms/admin/nodeBuilder/ColorTokenOrCustom.tsx
//
// Theme layer / style pipeline (Task 16) — the real token-vs-custom color picker that
// TypographyColorControl.tsx's `solid` branch and NodeStyleTab.tsx's background/border
// (base + hover) controls were all waiting on. Every one of those call sites previously
// carried an `as string` cast on `StyleObject`'s `string | ThemeColorTokenRef` color
// fields with a comment saying "no token-picker UI yet (Task 13's job)" — Task 10 widened
// the types but deliberately left the UI as a later task. This file is that UI, extracted
// to its own module (not "local to NodeStyleTab.tsx" as originally sketched) because
// TypographyColorControl.tsx is a separate component file that also needs it.
//
// Always renders the theme-token `<Select>` (so an admin can switch INTO token mode any
// time); the raw-literal `ColorControl` beneath it only renders while the current value is
// NOT a token, so the two editors are mutually exclusive rather than both visibly "live"
// at once.
import { Show } from 'solid-js';
import { Select } from '@core/components/control/Select';
import { ColorControl } from '@modules/cms/admin/builder/ColorControl';
import type { ThemeColorSet, ThemeColorTokenRef } from '@/modules/theme/theme.types';
import { isThemeColorTokenRef } from '@/modules/theme/theme.types';
import type { ThemeDTO } from '@/shared/services/theme/theme.service';
import { t } from '@/shared/i18n/t';

const LABEL_CLASS = 'mb-1 block text-xs font-medium text-nb-text-muted';

export interface ColorTokenOrCustomProps {
    /** Passed straight through to the inner raw-literal `ColorControl`'s own `label` — each
     * call site reuses whichever field-specific i18n key it already had (backgroundValue/
     * borderColor/textColor), so existing tests keyed off those exact label strings keep
     * passing unchanged. */
    label: string;
    value: string | ThemeColorTokenRef | undefined;
    activeTheme: ThemeDTO | undefined;
    defaultValue: string;
    onChange: (value: string | ThemeColorTokenRef | undefined) => void;
}

/** Uses the real `ThemeColorTokenRef`/`isThemeColorTokenRef` from theme.types.ts (not a
 * hand-shaped `{ tokenRef: string }` lookalike) — applyNodeStyle.ts's `resolveColorValue`
 * carries the same warning: a locally-shaped duplicate type isn't structurally excludable
 * by the real predicate's `value is ThemeColorTokenRef` narrowing, which is exactly what
 * regressed `npx astro check` from 0 to 14 errors the last time this was gotten wrong
 * (Task 10). */
export function ColorTokenOrCustom(props: ColorTokenOrCustomProps) {
    const isToken = () => isThemeColorTokenRef(props.value);
    const tokenOptions = () =>
        Object.keys(props.activeTheme?.colors?.light ?? {}).map((key) => ({ value: key, label: key }));

    return (
        <div class="flex flex-col gap-2">
            <div>
                <label class={LABEL_CLASS}>{t('cms.node.style.colorToken')}</label>
                <Select
                    clearable
                    options={tokenOptions()}
                    value={isToken() ? (props.value as ThemeColorTokenRef).tokenRef : undefined}
                    onChange={(v) => props.onChange(v ? { tokenRef: v as keyof ThemeColorSet } : undefined)}
                    fieldless
                />
            </div>
            <Show when={!isToken()}>
                <ColorControl
                    label={props.label}
                    value={props.value as string | undefined}
                    defaultValue={props.defaultValue}
                    onChange={(v) => props.onChange(v)}
                />
            </Show>
        </div>
    );
}
