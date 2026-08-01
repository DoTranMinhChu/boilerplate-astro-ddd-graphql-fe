import { mergeClass } from '@core/helpers/class';

export interface SkeletonProps extends BaseProps {
  direction?: 'row' | 'column';
}
export function Skeleton(props: SkeletonProps) {
  const skeletonClass = () =>
    mergeClass(
      `flex gap-2`,
      props.direction == 'row' ? 'flex-row' : 'flex-col',
      props.class,
    );
  return (
    <div class={skeletonClass()} style={props.style}>
      {props.children}
    </div>
  );
}

interface SkeletonBlockProps extends BaseProps {
  shape?: 'block' | 'square' | 'video' | 'circle';
}
function SkeletonBlock(props: SkeletonBlockProps) {
  const skeletonBlockClass = () =>
    mergeClass(
      `min-w-4 min-h-4 bg-neutral-100 rounded-sm animate-pulse`,
      props.shape == 'circle'
        ? 'rounded-full'
        : props.shape == 'square'
          ? 'aspect-square'
          : props.shape == 'video'
            ? 'aspect-video'
            : 'h-8',
      props.class,
    );
  return <div class={skeletonBlockClass()} style={props.style}></div>;
}

function SkeletonDivider(props: BaseProps) {
  const skeletonBlockClass = () =>
    mergeClass(`w-full border-t border-light my-2`, props.class);
  return <div class={skeletonBlockClass()} style={props.style}></div>;
}

Skeleton.Row = (props: SkeletonProps) =>
  Skeleton({ ...props, direction: 'row' });
Skeleton.Col = (props: SkeletonProps) =>
  Skeleton({ ...props, direction: 'column' });
Skeleton.Block = SkeletonBlock;
Skeleton.Circle = (props: SkeletonProps) =>
  SkeletonBlock({ ...props, shape: 'circle' });
Skeleton.Square = (props: SkeletonProps) =>
  SkeletonBlock({ ...props, shape: 'square' });
Skeleton.Video = (props: SkeletonProps) =>
  SkeletonBlock({ ...props, shape: 'video' });
Skeleton.Divider = (props: SkeletonProps) => SkeletonDivider(props);
