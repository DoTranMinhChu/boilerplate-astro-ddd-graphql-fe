import { Icon } from '@shared/components/icons/Icon';

export function WorkInProgressPage() {
  return (
    <>
      <div class="h-40 w-full animate-slide-in-fwd-center flex-col-center">
        <Icon class="text-5xl text-warning" name="tabler:progress-alert" />
        <div class="mt-2 text-lg font-medium text-neutral-700">
          Tính năng đang phát triển
        </div>
      </div>
    </>
  );
}
