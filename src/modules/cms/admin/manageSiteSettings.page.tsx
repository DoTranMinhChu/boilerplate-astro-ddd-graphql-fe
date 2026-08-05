import { createResource, Show } from 'solid-js';
import { generateForm } from '@core/components/form/generateForm';
import { Input } from '@core/components/control/Input';
import { Textarea } from '@core/components/control/Textarea';
import { Button } from '@core/components/button/Button';
import { Card } from '@core/components/utilities/Card';
import { toast } from '@core/components/toast/ToastProvider';
import { SiteSettingsService, type SiteSettingsDTO } from '@/shared/services/siteSettings/siteSettings.service';
import { TwoFieldListInput } from './TwoFieldListInput';
import { FooterColumnsInput } from './FooterColumnsInput';
import { t } from '@/shared/i18n/t';

const { Form, submitting } = generateForm<SiteSettingsDTO, SiteSettingsDTO>({
    handleSubmit: async (values) => {
        const saved = await SiteSettingsService.updateSiteSettings({
            data: {
                logoText: values.logoText,
                navLinks: values.navLinks as any,
                hotlineLabel: values.hotlineLabel,
                hotline: values.hotline,
                footerHeading: values.footerHeading,
                footerEmail: values.footerEmail,
                footerColumns: values.footerColumns as any,
                footerOutlineText: values.footerOutlineText,
            },
        });
        toast().success(t('cms.siteSettings.saveSuccess'));
        return saved;
    },
});

/** Site-wide chrome (header nav + footer, see chrome/SiteHeader.tsx and
 * chrome/SiteFooter.tsx) — a singleton, not a per-page CMS Section, so it gets
 * its own settings form instead of living in the Page Builder. */
export function ManageSiteSettingsPage() {
    const [settings] = createResource(() => SiteSettingsService.getSiteSettings());

    return (
        <div class="space-y-6 animate-in">
            <Card class="border-none shadow-sm p-8">
                <h1 class="text-lg font-semibold text-gray-900">{t('cms.siteSettings.title')}</h1>
                <p class="mb-6 text-sm text-neutral-500">{t('cms.siteSettings.description')}</p>

                <Show when={!settings.loading} fallback={<p class="text-sm text-neutral-400">{t('common.loading')}</p>}>
                    <Form initialValues={settings() as SiteSettingsDTO} class="space-y-10">
                        <section class="space-y-4">
                            <h2 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">{t('cms.siteSettings.headerSection')}</h2>
                            <div class="grid max-w-md grid-cols-1 gap-4">
                                <Form.Field name="logoText" label={t('cms.siteSettings.logoText')}>
                                    <Input placeholder="Catbox" />
                                </Form.Field>
                            </div>
                            <Form.Field name="navLinks" label={t('cms.siteSettings.navLinks')}>
                                <TwoFieldListInput field1Key="label" field1Label={t('cms.siteSettings.navLinkLabel')} field2Key="href" field2Label={t('cms.siteSettings.navLinkHref')} addLabel={t('cms.siteSettings.addNavLink')} />
                            </Form.Field>
                        </section>

                        <section class="space-y-4 border-t border-neutral-100 pt-8">
                            <h2 class="text-sm font-semibold uppercase tracking-wide text-neutral-400">{t('cms.siteSettings.footerSection')}</h2>
                            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Form.Field name="hotlineLabel" label={t('cms.siteSettings.hotlineLabel')}>
                                    <Input />
                                </Form.Field>
                                <Form.Field name="hotline" label={t('cms.siteSettings.hotline')}>
                                    <Input />
                                </Form.Field>
                            </div>
                            <Form.Field name="footerHeading" label={t('cms.siteSettings.footerHeading')}>
                                <Textarea rows={2} />
                            </Form.Field>
                            <div class="grid max-w-md grid-cols-1 gap-4">
                                <Form.Field name="footerEmail" label={t('cms.siteSettings.footerEmail')}>
                                    <Input />
                                </Form.Field>
                            </div>
                            <Form.Field name="footerColumns" label={t('cms.siteSettings.footerColumns')}>
                                <FooterColumnsInput />
                            </Form.Field>
                            <Form.Field name="footerOutlineText" label={t('cms.siteSettings.footerOutlineText')} description={t('cms.siteSettings.footerOutlineTextHint')}>
                                <Input />
                            </Form.Field>
                        </section>

                        <Form.Error class="text-sm font-medium text-red-600" />
                        <Button submit main loading={submitting()}>{t('common.save')}</Button>
                    </Form>
                </Show>
            </Card>
        </div>
    );
}
