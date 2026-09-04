import { createSignal, Show } from 'solid-js';
import { Card } from '@core/components/utilities/Card';
import { Select } from '@core/components/control/Select';
import { Input } from '@core/components/control/Input';
import { Icon } from '@shared/components/icons/Icon';
import { TenantService, TenantDTO, FEATURE_OPTIONS } from '@/shared/services/tenant/tenant.service';
import { AgencyService } from '@/shared/services/agency/agency.service';
import { generateDatatable, PagingArgsInput } from '@/shared/components/table/GeneratedDatatable';
import { CreateTenantInput, UpdateTenantInput } from '@shared/generated/typed-graphql';
import { useNavigate } from '@solidjs/router';
import { formatDatetime } from '@/core/helpers/date';
import { Avatar } from '@/core/components/utilities/Avatar';
import { InputImage } from '@/core/components/control/InputImage';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { useSystemConfig } from '@/shared/contexts/systemConfig/SystemConfigContext';
import { t } from '@/shared/i18n/t';

export function ManageTenantsPage() {
  const navigate = useNavigate();
  const [selectedAgencyId, setSelectedAgencyId] = createSignal<string | null>(null);
  const { isAdmin, isAgency, authAccount } = useAuth();
  const { config } = useSystemConfig();

  // ID của agency đang đăng nhập (dùng để auto-inject khi tạo tenant)
  const myAgencyId = () => authAccount()?.agencyId ?? null;

  // Admin luôn tạo được; Agency chỉ tạo khi flag bật
  const canCreateTenant = () => isAdmin?.() || config()?.allowAgencyCreateTenant !== false;
  const { Datatable } = generateDatatable<
    PagingArgsInput,
    TenantDTO,
    TenantDTO,
    TenantDTO,
    CreateTenantInput,
    UpdateTenantInput
  >({
    service: TenantService,
    paginatedQuery: TenantService.getAllTenant,
    queryInput: {
      sort: { createdAt: 'DESC' },
      get filter() {
        return selectedAgencyId() ? { agencyId: selectedAgencyId() } : undefined;
      },
    },
    itemQuery: (item) => TenantService.getOneTenant(item?.id!),
    createMutation: (data) => TenantService.createTenant(data),
    updateMutation: (id, data) => TenantService.updateTenant({ id, data }),
    deleteMutation: (item) => TenantService.deleteTenant(item.id!),
  });

  return (
    <div class="space-y-6 animate-in">

      {/* ── FILTER BAR ─────────────────────────────────────────────────────────
          [MOBILE] flex-col thay vi flex-row ngang
          → label + select xep doc, badge filter xuat hien bên dưới
      ──────────────────────────────────────────────────────────────────────── */}
      <Show when={isAdmin()}>
        <Card class="p-4 border-none shadow-sm bg-white">
          {/* [THEM] flex-col gap-3 tren mobile (sm:flex-row sm:items-center) */}

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

            <div class="flex-none">
              <span class="text-sm font-bold text-gray-500 uppercase tracking-wider">
                {t('tenant.manageTenants.filterByAgency')}
              </span>
            </div>

            {/* [THEM] w-full tren mobile, co dinh w-80 tren sm+ */}
            <div class="w-full sm:w-80">
              <Select
                placeholder={t('tenant.manageTenants.allAgency')}
                clearable
                value={selectedAgencyId()}
                onChange={(val) => setSelectedAgencyId(val as string)}
                optionsQuery={{
                  query: (input) => AgencyService.getAllAgency(input.input),
                  option: (item: any) => ({ label: item.name!, value: item.id! }),
                }}
                prefix={<Icon name="heroicons-outline:briefcase" class="w-4 h-4 text-indigo-500" />}
              />
            </div>

            <Show when={selectedAgencyId()}>
              <div class="text-xs text-indigo-600 font-medium bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 flex items-center gap-1 w-fit">
                <Icon name="heroicons-solid:filter" class="w-3 h-3" />
                {t('tenant.manageTenants.filteringNotice')}
              </div>
            </Show>

          </div>

        </Card>
      </Show>
      {/* ── DATATABLE ──────────────────────────────────────────────────────────
          Core đã tự xử lý responsive cho:
            - Datatable.Header  → flex-col tren mobile (KHONG can sua)
            - Datatable.Buttons → wrap + w-full tren mobile (KHONG can sua)
            - Datatable.Toolbar → flex-col tren mobile (KHONG can sua)
            - Datatable.Table   → auto switch sang CardView tren mobile
            - Datatable.Formlog → w-full + drawer tren mobile (KHONG can sua)
      ──────────────────────────────────────────────────────────────────────── */}
      <Card class="border-none shadow-sm">
        <Datatable id="TenantsMainTable">

          {/* Header, Title, Buttons: KHONG thay doi — core tu xu ly flex-col tren mobile */}
          <Datatable.Header>
            <Datatable.Title
              title={t('tenant.manageTenants.title')}
              description={t('tenant.manageTenants.description')}
            />
            <Datatable.Buttons>
              <Datatable.ButtonRefresh />
              <Show when={canCreateTenant()}>
                <Datatable.ButtonCreate label={t('tenant.manageTenants.addButton')} />
              </Show>
            </Datatable.Buttons>
          </Datatable.Header>

          <Datatable.Toolbar>
            <Datatable.Search />
          </Datatable.Toolbar>

          {/* Table: KHONG thay doi — core tu switch sang CardView tren mobile */}
          <Datatable.Table>
            <Datatable.Column title={t('tenant.manageTenants.columnOrg')}>
              {(item) => (
                <div class="flex items-center gap-3">
                  <Avatar
                    text={item.name!}
                    class="rounded-lg bg-indigo-100 text-indigo-700"
                    src={item.logoMedia?.url!}
                    width="48px"
                  />
                  <div class="flex flex-col">
                    <span class="font-bold text-gray-900">{item.name}</span>
                    <span class="text-xs text-gray-500">{t('tenant.manageTenants.codeLabel', { code: item.code ?? '' })}</span>
                  </div>
                </div>
              )}
            </Datatable.Column>

            <Datatable.Column title={t('tenant.manageTenants.columnCode')}>
              {(item) => (
                <span class="badge-tag bg-gray-100 text-gray-700 border-gray-200">
                  {item.code}
                </span>
              )}
            </Datatable.Column>

            <Show when={isAdmin?.()}>
              <Datatable.Column title={t('tenant.manageTenants.columnAgency')}>
                {(item) => (
                  <div class="flex items-center gap-2 text-indigo-600 font-medium">
                    <Icon name="heroicons-outline:briefcase" class="w-4 h-4" />
                    {item.agency?.name || t('tenant.manageTenants.unknown')}
                  </div>
                )}
              </Datatable.Column>
            </Show>

            <Datatable.Column title={t('tenant.manageTenants.columnCreatedAt')}>
              {(item) => (
                <span class="text-sm text-gray-500">
                  {formatDatetime(item.createdAt!, 'datetime')}
                </span>
              )}
            </Datatable.Column>

            {/* right + fitContent → core nhan biet day la action col → xuat hien o footer card */}
            <Datatable.Column right fitContent>
              {(item) => (
                <Datatable.CellButtons>
                  <Datatable.CellButton
                    icon={<Icon name="heroicons-outline:presentation-chart-line" />}
                    label={t('tenant.manageTenants.detailButton')}
                    class="text-blue-600 bg-blue-50"
                    onClick={() => navigate(`detail?tenantId=${item.id}`)}
                  />
                  <Datatable.CellButtonUpdate item={item} />
                  <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                </Datatable.CellButtons>
              )}
            </Datatable.Column>
          </Datatable.Table>


          <Datatable.CardView>
            {(item) => (
              /* [THEM] toan bo block nay la card layout cho mobile */
              <div class="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs">

                {/* Card body */}
                <div class="p-4 flex items-start gap-3">
                  {/* Avatar */}
                  <Avatar
                    text={item.name!}
                    class="rounded-lg bg-indigo-100 text-indigo-700 shrink-0"
                    src={item.logoMedia?.url!}
                    width="44px"
                  />

                  {/* Info */}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-gray-900 truncate">{item.name}</span>
                      {/* [THEM] Badge code hien thi inline voi ten tren mobile */}
                      <span class="badge-tag bg-gray-100 text-gray-700 border-gray-200 shrink-0">
                        {item.code}
                      </span>
                    </div>

                    {/* Agency — chỉ Admin mới cần thấy */}
                    <Show when={isAdmin?.()}>
                      <div class="flex items-center gap-1.5 mt-1 text-xs text-indigo-600 font-medium">
                        <Icon name="heroicons-outline:briefcase" class="w-3.5 h-3.5" />
                        <span class="truncate">{item.agency?.name || t('tenant.manageTenants.unknown')}</span>
                      </div>
                    </Show>

                    {/* Ngay dang ky — hien o duoi cung */}
                    <p class="text-xs text-gray-400 mt-1">
                      {formatDatetime(item.createdAt!, 'datetime')}
                    </p>
                  </div>
                </div>

                {/* Card footer: action buttons */}
                {/* [THEM] border-t ngan cach voi body, bg-neutral-50 nhu table action row */}
                <div class="border-t border-neutral-100 px-4 py-2.5 bg-neutral-50 flex justify-end gap-1">
                  <Datatable.CellButton
                    icon={<Icon name="heroicons-outline:presentation-chart-line" />}
                    label={t('tenant.manageTenants.detailButton')}
                    class="text-blue-600 bg-blue-50"
                    onClick={() => navigate(`detail?tenantId=${item.id}`)}
                  />
                  <Datatable.CellButtonUpdate item={item} />
                  <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                </div>

              </div>
            )}
          </Datatable.CardView>
          {/* ── [KET THUC] CardView ──────────────────────────────────────────── */}

          <Datatable.Pagination />

          {/* Formlog: KHONG thay doi — core tu xu ly w-full + chuyen sang drawer tren mobile */}
          <Datatable.Formlog
            viewMode="modal"
            class="w-full max-w-[800px]"
            transformCreateInitialValues={() => ({
              // Agency: dùng agencyId của chính họ, Admin: dùng agencyId đang filter (nếu có)
              agencyId: isAgency?.() ? (myAgencyId() ?? '') : (selectedAgencyId() ?? ''),
            })}
          >
            {(item) => (
              /* [THEM] tren mobile grid-cols-12 se gap tren man hinh nho
                 → doi thanh grid-cols-1 tren mobile, giu 12 cols tren sm+ */
              <div class="col-span-full grid grid-cols-1 sm:grid-cols-12 gap-x-6 gap-y-5 p-4 sm:p-8">

                {/* Section: Doi tac — chỉ Admin mới thấy; Agency tự động gắn agencyId của mình */}
                <Show when={isAdmin?.()}>
                  <div class="col-span-full bg-indigo-50/50 p-4 sm:p-6 rounded-2xl border border-indigo-100 grid grid-cols-1 sm:grid-cols-12 gap-5">
                    <p class="col-span-full text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                      {t('tenant.manageTenants.sectionAgency')}
                    </p>
                    <div class="col-span-full">
                      <Datatable.Field name="agencyId" label={t('tenant.manageTenants.agencyFieldLabel')} required disabled={!!item}>
                        <Select
                          readOnly={!!selectedAgencyId()}
                          placeholder={t('tenant.manageTenants.agencyPlaceholder')}
                          optionsQuery={{
                            query: (input) => AgencyService.getAllAgency(input.input),
                            option: (a: any) => ({ label: a.name!, value: a.id! }),
                          }}
                        />
                      </Datatable.Field>
                    </div>
                  </div>
                </Show>

                {/* Section: Thong tin Tenant */}
                {/* [THEM] grid-cols-1 tren mobile, 12 cols tren sm+ */}
                <div class="col-span-full grid grid-cols-1 sm:grid-cols-12 gap-5">
                  <p class="col-span-full text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    {t('tenant.manageTenants.sectionTenantInfo')}
                  </p>

                  {/* [THEM] col-span-full tren mobile, col-span-8 tren sm+ */}
                  <div class="col-span-full sm:col-span-8">
                    <Datatable.Field name="logoMediaId">
                      <InputImage medias={item?.logoMedia! as any} />
                    </Datatable.Field>
                  </div>

                  {/* [THEM] col-span-full tren mobile, col-span-8 tren sm+ */}
                  <div class="col-span-full sm:col-span-8">
                    <Datatable.Field name="name" label={t('tenant.manageTenants.nameFieldLabel')} required>
                      <Input placeholder={t('tenant.manageTenants.namePlaceholder')} />
                    </Datatable.Field>
                  </div>

                  {/* [THEM] col-span-full tren mobile, col-span-4 tren sm+
                      Tren mobile "Ma Code" khong con bi ep tren 1 hang voi "Ten" */}
                  <div class="col-span-full sm:col-span-4">
                    <Datatable.Field name="code" label={t('tenant.manageTenants.codeFieldLabel')} required disabled={!!item}>
                      <Input readOnly={!!item} placeholder={t('tenant.manageTenants.codePlaceholder')} />
                    </Datatable.Field>
                  </div>

                  <div class="col-span-full">
                    <Datatable.Field name="contactEmail" label={t('tenant.manageTenants.emailFieldLabel')} required>
                      <Input placeholder={t('tenant.manageTenants.emailPlaceholder')} />
                    </Datatable.Field>
                  </div>

                  <div class="col-span-full">
                    <Datatable.Field name="subscribedFeatures" label={t('tenant.manageTenants.featuresFieldLabel')} required >
                      <Select
                        multi
                        type="array"
                        hasColor
                        options={FEATURE_OPTIONS}
                      />
                    </Datatable.Field>
                  </div>
                </div>

              </div>
            )}
          </Datatable.Formlog>

        </Datatable>
      </Card>
    </div>
  );
}