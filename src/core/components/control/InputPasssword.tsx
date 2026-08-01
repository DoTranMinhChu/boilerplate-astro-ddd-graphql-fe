import { Button, ButtonProps } from '@core/components/button/Button';
import { baseConfig } from '@core/components/config/BaseConfig';
import { Input, InputProps } from '@core/components/control/Input';
import { createSignal } from 'solid-js';

export interface InputPasswordProps extends InputProps {
  buttonProps?: ButtonProps;
  iconOn?: JSX.Element;
  iconOff?: JSX.Element;
}
export function InputPassword(props: InputPasswordProps) {
  const [showPassword, setShowPassword] = createSignal(false);
  const iconOn = () => props.iconOn || baseConfig().iconEyeOn();
  const iconOff = () => props.iconOff || baseConfig().iconEyeOff();
  const icon = () => (showPassword() ? iconOff() : iconOn());

  return (
    <Input
      {...props}
      type={showPassword() ? 'text' : 'password'}
      suffix={
        <Button
          sm
          light
          icon={icon()}
          {...props.buttonProps}
          onClick={() => {
            setShowPassword((val) => !val);
          }}
        />
      }
      suffixClass="px-1"
    />
  );
}
