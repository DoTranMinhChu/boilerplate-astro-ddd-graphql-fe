import { Dialog } from '@core/components/dialog/Dialog';
import { Tabs } from '@core/components/tab/Tabs';
import { Icon } from '@shared/components/icons/Icon';
import { For } from 'solid-js';
import { t, tOrLiteral } from '@/shared/i18n/t';

interface SmtpGuideDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ConfigRow = { label: string; value: string; mono?: boolean };
type Step = { text: string; sub?: string };

interface ProviderGuide {
  name: string;
  icon: string;
  iconColor: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  config: ConfigRow[];
  note?: string;
  steps?: Step[];
  stepsTitle?: string;
}

// NOTE: `label`/`value`/`text`/`sub`/`note`/`stepsTitle`/`name` fields below hold
// TRANSLATION KEYS (not literal strings) for the Vietnamese-content ones — this array
// is a module-scoped constant evaluated once at import time, so translating eagerly
// here would freeze the text at whichever locale was active on load. Actual
// translation happens at render time via `t(...)` in ConfigTable/StepList/ProviderTab
// below, which keeps it reactive to locale switches. Already-English/technical values
// (hostnames, ports, brand names) are left as plain literals.
const PROVIDERS: ProviderGuide[] = [
  {
    name: 'Gmail',
    icon: 'logos:google-gmail',
    iconColor: 'text-red-500',
    accentBg: 'bg-red-50',
    accentBorder: 'border-red-100',
    accentText: 'text-red-700',
    config: [
      { label: 'SMTP Host', value: 'smtp.gmail.com', mono: true },
      { label: 'Port', value: '587' },
      { label: 'admin.smtpGuide.common.encryptionLabel', value: 'admin.smtpGuide.common.starttls' },
      { label: 'admin.smtpGuide.common.accountLabel', value: 'admin.smtpGuide.providers.gmail.accountValue' },
      { label: 'admin.smtpGuide.common.passwordLabel', value: 'admin.smtpGuide.providers.gmail.passwordValue' },
    ],
    stepsTitle: 'admin.smtpGuide.providers.gmail.stepsTitle',
    steps: [
      { text: 'admin.smtpGuide.providers.gmail.step1', sub: 'admin.smtpGuide.providers.gmail.step1Sub' },
      { text: 'admin.smtpGuide.providers.gmail.step2' },
      { text: 'admin.smtpGuide.providers.gmail.step3' },
      { text: 'admin.smtpGuide.providers.gmail.step4' },
      { text: 'admin.smtpGuide.providers.gmail.step5', sub: 'admin.smtpGuide.providers.gmail.step5Sub' },
    ],
    note: 'admin.smtpGuide.providers.gmail.note',
  },
  {
    name: 'Outlook / M365',
    icon: 'logos:microsoft-icon',
    iconColor: 'text-blue-600',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-100',
    accentText: 'text-blue-700',
    config: [
      { label: 'SMTP Host', value: 'smtp.office365.com', mono: true },
      { label: 'Port', value: '587' },
      { label: 'admin.smtpGuide.common.encryptionLabel', value: 'admin.smtpGuide.common.starttls' },
      { label: 'admin.smtpGuide.common.accountLabel', value: 'admin.smtpGuide.providers.outlook.accountValue' },
      { label: 'admin.smtpGuide.common.passwordLabel', value: 'admin.smtpGuide.providers.outlook.passwordValue' },
    ],
    note: 'admin.smtpGuide.providers.outlook.note',
  },
  {
    name: 'admin.smtpGuide.providers.custom.name',
    icon: 'heroicons-outline:server',
    iconColor: 'text-gray-600',
    accentBg: 'bg-gray-50',
    accentBorder: 'border-gray-200',
    accentText: 'text-gray-700',
    config: [
      { label: 'SMTP Host', value: 'admin.smtpGuide.providers.custom.hostValue', mono: true },
      { label: 'Port', value: 'admin.smtpGuide.providers.custom.portValue' },
      { label: 'admin.smtpGuide.common.encryptionLabel', value: 'admin.smtpGuide.providers.custom.encryptionValue' },
      { label: 'admin.smtpGuide.common.accountLabel', value: 'admin.smtpGuide.providers.custom.accountValue' },
      { label: 'admin.smtpGuide.common.passwordLabel', value: 'admin.smtpGuide.providers.custom.passwordValue' },
    ],
    stepsTitle: 'admin.smtpGuide.providers.custom.stepsTitle',
    steps: [
      { text: 'admin.smtpGuide.providers.custom.step1' },
      { text: 'admin.smtpGuide.providers.custom.step2' },
      { text: 'admin.smtpGuide.providers.custom.step3' },
    ],
  },
  {
    name: 'Amazon SES',
    icon: 'logos:aws',
    iconColor: 'text-orange-500',
    accentBg: 'bg-orange-50',
    accentBorder: 'border-orange-100',
    accentText: 'text-orange-700',
    config: [
      { label: 'SMTP Host', value: 'email-smtp.<region>.amazonaws.com', mono: true },
      { label: 'Port', value: '587' },
      { label: 'admin.smtpGuide.common.encryptionLabel', value: 'admin.smtpGuide.common.starttls' },
      { label: 'admin.smtpGuide.common.accountLabel', value: 'admin.smtpGuide.providers.ses.accountValue' },
      { label: 'admin.smtpGuide.common.passwordLabel', value: 'SMTP Secret Access Key' },
    ],
    stepsTitle: 'admin.smtpGuide.providers.ses.stepsTitle',
    steps: [
      { text: 'AWS Console → SES → SMTP Settings → Create SMTP credentials' },
      { text: 'admin.smtpGuide.providers.ses.step2', sub: 'admin.smtpGuide.providers.ses.step2Sub' },
    ],
    note: 'admin.smtpGuide.providers.ses.note',
  },
];

function ConfigTable(props: { rows: ConfigRow[] }) {
  return (
    <div class="rounded-xl border border-gray-100 overflow-hidden text-sm">
      <For each={props.rows}>
        {(row, i) => (
          <div class={`flex gap-3 px-4 py-2.5 ${i() % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}`}>
            <span class="w-32 shrink-0 text-gray-500 font-medium">{tOrLiteral(row.label)}</span>
            <span class={row.mono ? 'font-mono text-gray-800 text-xs leading-5' : 'text-gray-800'}>
              {tOrLiteral(row.value)}
            </span>
          </div>
        )}
      </For>
    </div>
  );
}

function StepList(props: { steps: Step[]; title: string }) {
  return (
    <div class="mt-4">
      <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{tOrLiteral(props.title)}</p>
      <ol class="space-y-2">
        <For each={props.steps}>
          {(step, i) => (
            <li class="flex gap-3">
              <span class="shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i() + 1}
              </span>
              <div>
                <p class="text-sm text-gray-700">{tOrLiteral(step.text)}</p>
                {step.sub && <p class="text-xs text-gray-400 mt-0.5">{tOrLiteral(step.sub)}</p>}
              </div>
            </li>
          )}
        </For>
      </ol>
    </div>
  );
}

function ProviderTab(props: { guide: ProviderGuide }) {
  const g = props.guide;
  return (
    <div class="space-y-4 pt-3">
      <div class={`rounded-xl ${g.accentBg} border ${g.accentBorder} p-4`}>
        <p class={`text-[11px] font-bold uppercase tracking-widest mb-3 ${g.accentText}`}>
          {t('admin.smtpGuide.connectionInfo')}
        </p>
        <ConfigTable rows={g.config} />
      </div>

      {g.steps && <StepList steps={g.steps} title={g.stepsTitle!} />}

      {g.note && (
        <div class="flex gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <Icon name="heroicons-outline:exclamation-triangle" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p class="text-xs text-amber-700">{tOrLiteral(g.note)}</p>
        </div>
      )}

      <div class="bg-gray-50 border border-gray-100 rounded-xl p-3">
        <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t('admin.smtpGuide.checkBeforeEntering')}</p>
        <p class="text-xs text-gray-500">
          {t('admin.smtpGuide.testHintPrefix')}{' '}
          <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">smtper.net</span>
          {' '}{t('admin.smtpGuide.testHintSuffix')}
        </p>
      </div>
    </div>
  );
}

export function SmtpGuideDialog(props: SmtpGuideDialogProps) {
  return (
    <Dialog
      id="smtp-guide-dialog"
      isOpen={props.isOpen}
      onClose={props.onClose}
      md
      scrollable
    >
      <Dialog.Header title={t('admin.smtpGuide.title')} />
      <Dialog.Body class="px-5 pb-6">
        <p class="text-sm text-gray-500 mb-4">
          {t('admin.smtpGuide.description')}
        </p>

        <Tabs id="smtp-guide-tabs">
          <For each={PROVIDERS}>
            {(guide) => (
              <Tabs.Tab label={tOrLiteral(guide.name)}>
                <ProviderTab guide={guide} />
              </Tabs.Tab>
            )}
          </For>
        </Tabs>
      </Dialog.Body>
    </Dialog>
  );
}
