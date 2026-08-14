// src/modules/cms/node/primitives/InquiryFormNode.tsx
import { For, Show, createSignal } from 'solid-js';
import DOMPurify from 'isomorphic-dompurify';
import { animate } from '@/modules/cms/animation/useAnimate';
import { getLayerForNode } from '../getLayerForNode';
import type { NodeComponentProps } from '../nodeRegistry';
import './editorialShared/editorialEffects.css';

const _ = animate;

export interface InquiryFormNodeContent {
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

/** Node primitive tương đương `InquiryFormSection.tsx`. Client-validated, KHÔNG submit đi đâu —
 * đúng hành vi gốc (chưa có BE endpoint, xem SITE_SPECIFICATION.md §3 "Contact form" ở comment
 * gốc). Wire 1 POST thật vào đây khi endpoint tồn tại — không phải phạm vi M2b. */
export function InquiryFormNode(props: NodeComponentProps) {
    const content = () => (props.node.props?.content ?? {}) as InquiryFormNodeContent;
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
                <h2 use:animate={getLayerForNode(props.node, 'heading')} class="m-0 font-light" style={{ 'font-size': 'clamp(32px, 3.5vw, 56px)' }}>
                    {content().heading}
                </h2>
                <Show when={content().subtitle}><div class="mt-4 text-[#9b9b9b] [&_p]:m-0" innerHTML={DOMPurify.sanitize(content().subtitle || '')} /></Show>

                <Show
                    when={!submitted()}
                    fallback={<p class="mt-16 rounded-lg border border-white/[.14] p-8 text-lg">{content().successMessage || 'Cảm ơn bạn! Chúng tôi sẽ liên hệ lại sớm nhất.'}</p>}
                >
                    <form use:animate={getLayerForNode(props.node, 'form')} class="mt-12 space-y-6" onSubmit={handleSubmit} novalidate>
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
