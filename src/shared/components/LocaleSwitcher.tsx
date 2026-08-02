// src/shared/components/LocaleSwitcher.tsx
//
// Small VI/EN toggle. Setting the locale updates the persisted signal in
// shared/i18n/locale.ts — every subsequent GraphQL request picks it up via the
// `x-locale` header (core/api/graphql.ts), and every `t()` call re-renders through it.
import { For } from 'solid-js';
import { getLocale, setLocale, SUPPORTED_LOCALES, type Locale } from '@/shared/i18n/locale';
import { t } from '@/shared/i18n/t';

const LOCALE_LABEL: Record<Locale, string> = {
    vi: 'VI',
    en: 'EN',
};

export function LocaleSwitcher(props: { class?: string }) {
    return (
        <div
            class={`inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 ${props.class ?? ''}`}
            role="group"
            aria-label={t('locale.switcherLabel')}
        >
            <For each={SUPPORTED_LOCALES}>
                {(loc) => (
                    <button
                        type="button"
                        onClick={() => setLocale(loc)}
                        class={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                            getLocale() === loc
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                        aria-pressed={getLocale() === loc}
                    >
                        {LOCALE_LABEL[loc]}
                    </button>
                )}
            </For>
        </div>
    );
}

export default LocaleSwitcher;
