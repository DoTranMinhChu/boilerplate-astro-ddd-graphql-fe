
import toMaterialStyle from 'material-color-hash';
import { Img, ImgProps } from './Img';
import { mergeClass } from '@/core/helpers/class';

export interface AvatarProps extends ImgProps {
  text: string | null | undefined;
}
export function Avatar(props: AvatarProps) {
  const avatarColor = () =>
    toMaterialStyle(props.text || '', 700).backgroundColor;
  const avatarBackgroundMain = () =>
    toMaterialStyle(props.text || '', 50).backgroundColor;
  const avatarBackgroundSub = () =>
    toMaterialStyle(props.text || '', 300).backgroundColor;
  const avatarBorder = () =>
    toMaterialStyle(props.text || '', 200).backgroundColor;

  const initialText = () => props.text?.slice(0, 1) || '';
  const defaultAvatarClass = () =>
    mergeClass(
      'relative w-9 h-9 overflow-hidden rounded-full border text-base font-bold flex-center',
      props.class,
    );

  return (
    <>
      <Img
        {...props}
        isAvatar
        src={
          props.src || (
            <div
              class={defaultAvatarClass()}
              style={{
                color: avatarColor(),
                background: `linear-gradient(to bottom right, ${avatarBackgroundMain()}, ${avatarBackgroundSub()})`,
                'border-color': avatarBorder(),
              }}
            >
              <span>{initialText().toUpperCase()}</span>
            </div>
          )
        }
      />
    </>
  );
}
