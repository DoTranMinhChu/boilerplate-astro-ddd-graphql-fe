
import { useLocation, A } from '@solidjs/router';
import { For, Show } from 'solid-js';

export function DashboardBreadcrumbs() {
  const location = useLocation();

  const pathMap: Record<string, string> = {
    home: 'Trang chủ',
    admin: 'Hệ thống',
    agency: 'Đối tác',
    tenant: 'Tổ chức',
    users: 'Tài khoản',
    bots: 'ChatBots',
    knowledge: 'Tri thức',
    customers: 'Khách hàng',
    'ai-config': 'Cấu hình AI',
    'custom-field': 'trường dữ liệu',
    customer: 'Khách hàng',
    appearance: 'Giao diện và thương hiệu',
    assessmentTemplate: 'Mẫu đánh giá',
    assessment: 'Đánh giá',
    execution: 'Thưc hiện',
    productionPlot: 'Điểm sản xuất',
    productionMember: 'Thành viên sản xuất',
    productionUnit: 'Vùng sản xuất',
    documentConfig: 'Thiết lập',
    documentTemplateApplication: 'Giá trị',
    documentTemplateFolder: 'Mẫu tài liệu',
    merchant: 'Chuyên viên',
    memberShip: 'Tài khoản',
    invitation: 'Lời mời',
    inviteMerchant: 'Lời mời',
    staff: 'Nhân viên',
    agriProductCatalog: 'Vật tư nông nghiệp',
    pestCatalog: 'Sâu bệnh',
    cultivationProtocol: 'Quy trình canh tác',
    cultivationLog: 'Nhật ký canh tác',
    processTemplate: 'Mẫu quy trình',
    processInstance: 'Quy trình',
    lot: "Lô",
    lotQRCode: "QR Lô",
    tenantPartnership: "Đối tác",
    laboratory: "Phòng LAB",
    processChain: "Chuỗi quy trình",
    purchaseOrder: "Đơn nhập",
    salesOrder: "Đơn xuất",
    stats: "Thống kê",
    profile: "Hồ sơ",

    samplingBatch: "Mẫu kiêm nghiệm",
    factory: "Nhà máy",
    warehouse: "Kho hàng",
    vehicle: "Phương tiện",
    lotShipment: "Vận chuyển",
    lotTransfer: "Chuyển giao",
    unit: "Đơn vị tính",
    'national-traceability-setup': 'Thiết lập Cổng TXNG',
    'national-traceability-onboarding-approvals': 'Duyệt kết nối MVAN',
    'national-traceability-gateway': 'Cấu hình kết nối MVAN',
    'national-traceability-catalog': 'Danh mục chuẩn TXNG',
    'national-traceability-catalogs': 'Danh mục chuẩn TXNG',
    'national-traceability-api-tester': 'Kiểm tra API TXNG',
    'mvan-tester': 'Kiểm tra API TXNG',
    traceability: 'Cổng TXNG',
    'traceability-overview': 'Tổng quan TXNG',
    onboarding: 'Thiết lập',
    'producer-registration': 'Đăng ký điểm sản xuất',
    'business-registration': 'Đăng ký tổ chức',
    labels: 'Quản lý tem nhãn',
    submissions: 'Lịch sử gửi',

  };

  const breadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      name: pathMap[path] || path,
      href: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1
    }));
  };

  return (
    <nav class="flex text-[11px] font-medium text-neutral-400">
      <For each={breadcrumbs()}>
        {(crumb) => (
          <div class="flex items-center">
            <Show when={!crumb.isLast} fallback={<span class="text-main-600">{crumb.name}</span>}>
              <A href={crumb.href} class="hover:text-neutral-600 transition-colors">
                {crumb.name}
              </A>
              <span class="mx-1.5 text-neutral-300">/</span>
            </Show>
          </div>
        )}
      </For>
    </nav>
  );
}
