import { AgencyService, AgencyDTO } from '@/shared/services/agency/agency.service';

import { generateDatatable, PagingArgsInput } from '@/core/components/table/GeneratedDatatable';
import { Card } from '@core/components/utilities/Card';
import { Avatar } from '@core/components/utilities/Avatar';
import { Icon } from '@shared/components/icons/Icon';
import { Input } from '@core/components/control/Input';
import { CreateAgencyInput, UpdateAgencyInput } from '@shared/generated/typed-graphql';
import { Label } from '@/core/components/form/Label';
import { useNavigate } from '@solidjs/router';
import { InputImage } from '@/core/components/control/InputImage';
import { t } from '@/shared/i18n/t';

export function ManageAgenciesPage() {
  const navigate = useNavigate();
  const { Datatable } = generateDatatable<PagingArgsInput, AgencyDTO, AgencyDTO, AgencyDTO, CreateAgencyInput, UpdateAgencyInput>({
    service: AgencyService,
    paginatedQuery: AgencyService.getAllAgency,
    queryInput: {},
    itemQuery: (item) => AgencyService.getOneAgency(item?.id!),
    createMutation: (data) => AgencyService.createAgency(data),
    updateMutation: (id, data) => AgencyService.updateAgency({ id, data }),
    deleteMutation: (item) => AgencyService.deleteAgency(item.id!),
  });

  return (
    <div class="space-y-6 animate-in">
      <Card>
        <Datatable id="AgencyTable">
          <Datatable.Header>
            <Datatable.Title title={t('agency.list.title')} description={t('agency.list.description')} />

            <Datatable.Buttons>
              <Datatable.ButtonRefresh />
              <Datatable.ButtonCreate label={t('agency.list.createLabel')} />
            </Datatable.Buttons>
          </Datatable.Header>

          <Datatable.Table>
            <Datatable.Column title={t('agency.list.columnPartner')}>
              {(item) => (
                <div class="flex items-center gap-3">
                  <Avatar text={item.name!} class="rounded-lg bg-indigo-100 text-indigo-700" src={item.logoMedia?.url!} width="48px" />
                  <div class="flex flex-col">
                    <span class="font-bold text-gray-900">{item.name}</span>
                    <span class="text-xs text-gray-500">{t('agency.list.codeLabel')} {item.code}</span>
                  </div>
                </div>
              )}
            </Datatable.Column>

            <Datatable.Column title={t('agency.list.columnContact')}>
              {(item) => (
                <div class="text-sm">
                  <div class="text-gray-700 font-medium">{item.contactEmail}</div>
                  <div class="text-gray-400 text-xs">{item.website}</div>
                </div>
              )}
            </Datatable.Column>

            <Datatable.Column title={t('agency.list.columnTaxCode')} class="text-gray-600">
              {(item) => item.taxCode || t('agency.common.na')}
            </Datatable.Column>

            <Datatable.Column right fitContent>
              {(item) => (
                <Datatable.CellButtons>
                  {/* Nút quản lý Tài khoản của Agency này */}
                  {/* NÚT XEM CHI TIẾT MỚI */}
                  <Datatable.CellButton
                    icon={<Icon name="heroicons-outline:presentation-chart-line" />}
                    label={t('agency.list.detailLabel')}
                    class="text-blue-600 bg-blue-50"
                    onClick={() => navigate(`detail?agencyId=${item.id}`)}
                  />
                  <Datatable.CellButtonUpdate item={item} />
                  <Datatable.CellButtonDelete item={item} itemName={item.name!} />
                </Datatable.CellButtons>
              )}
            </Datatable.Column>
          </Datatable.Table>

          <Datatable.Pagination />

          <Datatable.Formlog viewMode='modal' class='min-w-3xl'>
            {(item) => (
              <div class="col-span-full grid grid-cols-12 gap-6 p-6">
                <div class="col-span-full bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 grid grid-cols-12 gap-5">
                  <p class="col-span-full text-[11px] font-bold text-indigo-600 uppercase tracking-widest">{t('agency.list.formTitle')}</p>
                  <div class="col-span-4">
                    <Datatable.Field name="code" label={t('agency.list.codeFieldLabel')}>
                      {!!item ? <Label class='font-bold'> {item?.code}</Label> : <Input readOnly={!!item} placeholder="AIVN" />}

                    </Datatable.Field>
                  </div>
                  <div class="col-span-8">
                    <Datatable.Field name="logoMediaId" >
                      <InputImage medias={item?.logoMedia! as any} />
                    </Datatable.Field>

                  </div>
                  <div class="col-span-6">
                    <Datatable.Field name="name" label={t('agency.list.nameFieldLabel')} required>
                      <Input placeholder={t('agency.list.namePlaceholder')} />
                    </Datatable.Field>
                  </div>

                </div>

                <div class="col-span-6">
                  <Datatable.Field name="contactEmail" label={t('agency.list.contactEmailLabel')} required>
                    <Input placeholder="ceo@agency.com" />
                  </Datatable.Field>
                </div>
                <div class="col-span-6">
                  <Datatable.Field name="taxCode" label={t('agency.list.taxCodeFieldLabel')}>
                    <Input placeholder="010xxxxxx" />
                  </Datatable.Field>
                </div>
                <div class="col-span-full border-t pt-4">
                  <Datatable.Field name="website" label={t('agency.list.websiteLabel')}>
                    <Input placeholder="https://agency.com" />
                  </Datatable.Field>
                </div>
              </div>
            )}
          </Datatable.Formlog>
        </Datatable>
      </Card>
    </div>
  );
}