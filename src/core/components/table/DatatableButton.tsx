import { Button, ButtonProps } from '@core/components/button/Button';

export interface DatatableButtonProps extends ButtonProps {}
export function DatatableButton(props: DatatableButtonProps) {
  return <Button {...props} />;
}
