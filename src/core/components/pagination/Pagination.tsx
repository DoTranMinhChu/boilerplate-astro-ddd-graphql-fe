import { mergeClass } from '@core/helpers/class';
import { Index, createEffect, createMemo, createSignal } from 'solid-js';
import { Button, ButtonProps } from '../button/Button';
import { baseConfig } from '../config/BaseConfig';

export interface PaginationProps extends BaseProps {
  page: number;
  limit: number;
  totalCount: number;
  visiblePages?: number;
  onPageClick: (page: number) => any;
  buttonClass?: string;
  navigationButtonClass?: string;
  pageButtonClass?: string;
  activePageButtonClass?: string;
  ellipsisClass?: string;
  buttonProps?: ButtonProps;
  navigationButtonProps?: ButtonProps;
  pageButtonProps?: ButtonProps;
  activePageButtonProps?: ButtonProps;
  ellipsisButtonProps?: ButtonProps;
}
export function Pagination(props: PaginationProps) {
  const visiblePages = () => props.visiblePages || 2;
  const [page, setPage] = createSignal<number>(0);
  // const [paginationState, setPaginationState] = createSignal();

  const currentPage = () => props.page || 1;
  const totalPages = createMemo(() =>
    props.limit > 0 && props.totalCount > 0
      ? Math.ceil(props.totalCount / props.limit)
      : 1,
  );

  const pages = () => {
    let pageList: number[] = [];

    if (totalPages() + 1 <= visiblePages()) {
      pageList = Array.from({ length: totalPages() }, (_, i) => i + 1);
    } else {
      const midPoint = Math.ceil(visiblePages() / 2);
      if (currentPage() <= midPoint + 1) {
        pageList = Array.from({ length: visiblePages() }, (_, i) => i + 1);
      } else if (currentPage() >= totalPages() - midPoint) {
        pageList = Array.from(
          { length: visiblePages() },
          (_, i) => totalPages() - visiblePages() + i + 1,
        );
      } else {
        pageList = Array.from(
          { length: visiblePages() },
          (_, i) => currentPage() - midPoint + i + 1,
        );
      }

      if (!pageList.includes(1)) {
        pageList = [1, -1, ...pageList];
      }
      if (!pageList.includes(totalPages())) {
        pageList = [...pageList, -1, totalPages()];
      }
    }
    return pageList.map((page) => ({ page }));
  };

  createEffect(() => {
    setPage(props.page);
  });

  const paginationClass = () => mergeClass(`flex gap-1`, props.class);
  const buttonClass = () => mergeClass(props.buttonClass);
  const navigationButtonClass = () =>
    mergeClass(buttonClass(), props.navigationButtonClass);
  const ellipsisClass = () =>
    mergeClass(
      `pointer-events-none items-end -mx-1`,
      buttonClass(),
      props.ellipsisClass,
    );
  const pageButtonClass = () =>
    mergeClass(buttonClass(), props.pageButtonClass);
  const activePageButtonClass = () =>
    mergeClass(pageButtonClass(), props.activePageButtonClass);

  return (
    <div class={paginationClass()}>
      <Button
        light
        icon={baseConfig().iconChevronLeft()}
        disabled={page() <= 1}
        onClick={() => {
          props.onPageClick(page() - 1);
        }}
        class={navigationButtonClass()}
        {...props.buttonProps}
        {...props.navigationButtonProps}
      />
      <Index each={pages()}>
        {(page) => (
          <>
            {page().page > 0 ? (
              <Button
                label={page().page}
                class={
                  currentPage() == page().page
                    ? activePageButtonClass()
                    : pageButtonClass()
                }
                onClick={() => {
                  if (currentPage() !== page().page) {
                    props.onPageClick(page().page);
                  }
                }}
                {...(currentPage() == page().page
                  ? { solid: true, ...props.activePageButtonProps }
                  : { light: true })}
                {...props.buttonProps}
                {...props.pageButtonProps}
              />
            ) : (
              <Button
                flat
                icon={baseConfig().iconDots()}
                class={ellipsisClass()}
                {...props.buttonProps}
                {...props.ellipsisButtonProps}
              />
            )}
          </>
        )}
      </Index>
      <Button
        light
        icon={baseConfig().iconChevronRight()}
        disabled={page() >= totalPages()}
        onClick={() => {
          props.onPageClick(page() + 1);
        }}
        class={navigationButtonClass()}
        {...props.buttonProps}
        {...props.navigationButtonProps}
      />
    </div>
  );
}
