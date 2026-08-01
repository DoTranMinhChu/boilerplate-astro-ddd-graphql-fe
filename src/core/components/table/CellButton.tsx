import { Button, ButtonProps } from '@core/components/button/Button';

export interface CellButtonProps extends ButtonProps {}
export function CellButton(props: CellButtonProps) {
  return (
    <Button
      light={
        !props.type &&
        !props.solid &&
        !props.outline &&
        !props.flat &&
        !props.ghost
      }
      sm
      {...props}
    />
  );
}
