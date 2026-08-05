import { For, Show, createSignal } from 'solid-js';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayer } from '../sectionHelpers';
import type { ResolvedSection } from '@/modules/cms/cms.types';
import '../editorialEffects.css';

const _ = animate;

export interface InquiryFormContent {
    heading?: string;
    subtitle?: string;
    serviceOptions?: string[];
    submitLabel?: string;
    successMessage?: string;
}

interface FormState {
    name: string;
    email: string;
    phone: string;
    brief: string;
    services: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-validated inquiry form. Intentionally does NOT submit anywhere — no
 * backend endpoint is wired up yet. On successful validation it just shows the
 * success state, matching the reference design's own scope note (see
 * SITE_SPECIFICATION.md §3 "Contact form"). Wire a real POST here once an
 * endpoint exists. */
export function InquiryFormSection(props: { section: ResolvedSection }) {
    const content = () => (props.section.content || {}) as InquiryFormContent;
    const [form, setForm] = createSignal<FormState>({ name: '', email: '', phone: '', brief: '', services: [] });
    const [errors, setErrors] = createSignal<Partial<Record<keyof FormState, string>>>({});
    const [submitted, setSubmitted] = createSignal(false);

    const toggleService = (service: string) => {
        setForm((f) => ({
            ...f,
            services: f.services.includes(service) ? f.services.filter((s) => s !== service) : [...f.services, service],
        }));
    };

    const validate = (): boolean => {
        const f = form();
        const next: Partial<Record<keyof FormState, string>> = {};
        if (!f.name.trim()) next.name = 'Vui lòng nhập tên';
        if (!EMAIL_RE.test(f.email)) next.email = 'Email không hợp lệ';
        if (!f.brief.trim()) next.brief = 'Vui lòng mô tả dự án';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        if (validate()) setSubmitted(true);
    };

    return (
        <section class="bg-[#020202] py-20 text-[#f2f2f2]">
            <div class="mx-auto max-w-[900px] px-[5vw]">
                <h2 use:animate={getLayer(props.section, 'heading')} class="m-0 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <Show when={content().subtitle}><p class="mt-4 text-[#9b9b9b]">{content().subtitle}</p></Show>

                <Show
                    when={!submitted()}
                    fallback={<p class="mt-16 rounded-lg border border-white/[.14] p-8 text-lg">{content().successMessage || 'Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.'}</p>}
                >
                    <form use:animate={getLayer(props.section, 'form')} class="mt-12 space-y-6" onSubmit={handleSubmit} novalidate>
                        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <input
                                    class="w-full border-b border-white/[.28] bg-transparent py-3 outline-none placeholder:text-[#6b6b6b]"
                                    placeholder="Họ và tên *"
                                    value={form().name}
                                    onInput={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
                                    aria-invalid={!!errors().name}
                                />
                                <Show when={errors().name}><p class="mt-1 text-xs text-[#ed6aa8]">{errors().name}</p></Show>
                            </div>
                            <div>
                                <input
                                    class="w-full border-b border-white/[.28] bg-transparent py-3 outline-none placeholder:text-[#6b6b6b]"
                                    placeholder="Email *"
                                    value={form().email}
                                    onInput={(e) => setForm((f) => ({ ...f, email: e.currentTarget.value }))}
                                    aria-invalid={!!errors().email}
                                />
                                <Show when={errors().email}><p class="mt-1 text-xs text-[#ed6aa8]">{errors().email}</p></Show>
                            </div>
                        </div>
                        <input
                            class="w-full border-b border-white/[.28] bg-transparent py-3 outline-none placeholder:text-[#6b6b6b]"
                            placeholder="Số điện thoại"
                            value={form().phone}
                            onInput={(e) => setForm((f) => ({ ...f, phone: e.currentTarget.value }))}
                        />

                        <Show when={(content().serviceOptions?.length ?? 0) > 0}>
                            <div class="flex flex-wrap gap-2">
                                <For each={content().serviceOptions}>
                                    {(service) => (
                                        <button
                                            type="button"
                                            onClick={() => toggleService(service)}
                                            class={`rounded-full border px-4 py-1.5 text-sm transition ${
                                                form().services.includes(service) ? 'border-[#ed6aa8] text-[#ed6aa8]' : 'border-white/[.28] text-[#b8b8b8]'
                                            }`}
                                        >
                                            {service}
                                        </button>
                                    )}
                                </For>
                            </div>
                        </Show>

                        <div>
                            <textarea
                                class="w-full border-b border-white/[.28] bg-transparent py-3 outline-none placeholder:text-[#6b6b6b]"
                                rows={4}
                                placeholder="Mô tả dự án của bạn *"
                                value={form().brief}
                                onInput={(e) => setForm((f) => ({ ...f, brief: e.currentTarget.value }))}
                                aria-invalid={!!errors().brief}
                            />
                            <Show when={errors().brief}><p class="mt-1 text-xs text-[#ed6aa8]">{errors().brief}</p></Show>
                        </div>

                        <button type="submit" class="rounded-full px-8 py-3 font-semibold text-[#020202]" style={{ 'background-color': '#f2f2f2' }}>
                            {content().submitLabel || 'Gửi yêu cầu'}
                        </button>
                    </form>
                </Show>
            </div>
        </section>
    );
}
