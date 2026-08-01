import { Dialog } from '@core/components/dialog/Dialog';
import { Tabs } from '@core/components/tab/Tabs';
import { Icon } from '@shared/components/icons/Icon';
import { For } from 'solid-js';

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
      { label: 'Mã hóa', value: 'STARTTLS (tắt SSL/TLS)' },
      { label: 'Tài khoản', value: 'Địa chỉ Gmail của bạn' },
      { label: 'Mật khẩu', value: 'App Password (không phải mật khẩu Google)' },
    ],
    stepsTitle: 'Cách tạo App Password (bắt buộc bật xác minh 2 bước trước)',
    steps: [
      { text: 'Truy cập myaccount.google.com/apppasswords', sub: 'Đăng nhập tài khoản Gmail muốn dùng làm SMTP' },
      { text: 'Mục "Chọn ứng dụng" → chọn Thư; mục "Chọn thiết bị" → chọn Khác' },
      { text: 'Đặt tên tuỳ ý (VD: AgriBase) → nhấn Tạo' },
      { text: 'Google hiển thị mật khẩu 16 ký tự dạng xxxx xxxx xxxx xxxx' },
      { text: 'Sao chép và dán vào trường Mật khẩu SMTP', sub: 'Bỏ dấu cách hoặc giữ nguyên đều được' },
    ],
    note: 'App Password chỉ hiển thị một lần duy nhất — lưu lại ngay hoặc tạo lại nếu mất.',
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
      { label: 'Mã hóa', value: 'STARTTLS (tắt SSL/TLS)' },
      { label: 'Tài khoản', value: 'Địa chỉ Microsoft 365 của bạn' },
      { label: 'Mật khẩu', value: 'Mật khẩu đăng nhập thông thường' },
    ],
    note: 'Nếu tổ chức bật MFA / Conditional Access, liên hệ IT Admin để tạo App Password tại account.microsoft.com/security hoặc cấu hình SMTP AUTH riêng cho tài khoản dịch vụ.',
  },
  {
    name: 'SMTP Tùy chỉnh',
    icon: 'heroicons-outline:server',
    iconColor: 'text-gray-600',
    accentBg: 'bg-gray-50',
    accentBorder: 'border-gray-200',
    accentText: 'text-gray-700',
    config: [
      { label: 'SMTP Host', value: 'mail.yourdomain.com (domain mail của hosting)', mono: true },
      { label: 'Port', value: '465 (SSL) hoặc 587 (STARTTLS)' },
      { label: 'Mã hóa', value: 'Bật SSL/TLS nếu dùng port 465' },
      { label: 'Tài khoản', value: 'Email đầy đủ: noreply@yourdomain.com' },
      { label: 'Mật khẩu', value: 'Mật khẩu tạo trong cPanel/Plesk' },
    ],
    stepsTitle: 'Tạo email trong cPanel',
    steps: [
      { text: 'Đăng nhập cPanel → Email Accounts' },
      { text: 'Tạo account mới (VD: noreply@yourdomain.com)' },
      { text: 'Vào Connect Devices để xem thông tin SMTP' },
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
      { label: 'Mã hóa', value: 'STARTTLS (tắt SSL/TLS)' },
      { label: 'Tài khoản', value: 'SMTP Access Key ID (từ AWS Console)' },
      { label: 'Mật khẩu', value: 'SMTP Secret Access Key' },
    ],
    stepsTitle: 'Lấy credentials từ AWS',
    steps: [
      { text: 'AWS Console → SES → SMTP Settings → Create SMTP credentials' },
      { text: 'Tạo IAM user → tải file .csv', sub: 'Dùng SMTP_Access_Key_ID và SMTP_Secret_Access_Key (khác với IAM Access Key)' },
    ],
    note: 'SES mặc định ở Sandbox mode — chỉ gửi đến email đã verify. Cần request Production access để gửi email thật. Thay <region> bằng region của bạn, VD: ap-southeast-1.',
  },
];

function ConfigTable(props: { rows: ConfigRow[] }) {
  return (
    <div class="rounded-xl border border-gray-100 overflow-hidden text-sm">
      <For each={props.rows}>
        {(row, i) => (
          <div class={`flex gap-3 px-4 py-2.5 ${i() % 2 === 0 ? 'bg-gray-50/60' : 'bg-white'}`}>
            <span class="w-32 shrink-0 text-gray-500 font-medium">{row.label}</span>
            <span class={row.mono ? 'font-mono text-gray-800 text-xs leading-5' : 'text-gray-800'}>
              {row.value}
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
      <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{props.title}</p>
      <ol class="space-y-2">
        <For each={props.steps}>
          {(step, i) => (
            <li class="flex gap-3">
              <span class="shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i() + 1}
              </span>
              <div>
                <p class="text-sm text-gray-700">{step.text}</p>
                {step.sub && <p class="text-xs text-gray-400 mt-0.5">{step.sub}</p>}
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
          Thông tin kết nối
        </p>
        <ConfigTable rows={g.config} />
      </div>

      {g.steps && <StepList steps={g.steps} title={g.stepsTitle!} />}

      {g.note && (
        <div class="flex gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <Icon name="heroicons-outline:exclamation-triangle" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p class="text-xs text-amber-700">{g.note}</p>
        </div>
      )}

      <div class="bg-gray-50 border border-gray-100 rounded-xl p-3">
        <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Kiểm tra trước khi nhập</p>
        <p class="text-xs text-gray-500">
          Bạn có thể test SMTP tại{' '}
          <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">smtper.net</span>
          {' '}trước khi lưu cấu hình vào hệ thống.
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
      <Dialog.Header title="Hướng dẫn lấy thông tin SMTP" />
      <Dialog.Body class="px-5 pb-6">
        <p class="text-sm text-gray-500 mb-4">
          Chọn nhà cung cấp email bạn đang dùng để xem thông tin kết nối và hướng dẫn lấy mật khẩu SMTP.
        </p>

        <Tabs id="smtp-guide-tabs">
          <For each={PROVIDERS}>
            {(guide) => (
              <Tabs.Tab label={guide.name}>
                <ProviderTab guide={guide} />
              </Tabs.Tab>
            )}
          </For>
        </Tabs>
      </Dialog.Body>
    </Dialog>
  );
}
