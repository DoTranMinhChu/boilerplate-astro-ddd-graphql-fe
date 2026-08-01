import { ButtonColor, ButtonType } from "@core/components/button/Button";
import { baseConfig } from "@core/components/config/BaseConfig";
import {
  DatatableButton,
  DatatableButtonProps,
} from "@core/components/table/DatatableButton";
import { useDatatable } from "./DatatableContext";
import { splitProps } from "solid-js";

export interface DatatableButtonRefreshProps extends DatatableButtonProps {}

export function DatatableButtonRefresh(props: DatatableButtonRefreshProps) {
  const { refresh } = useDatatable();

  // Tách onClick ra khỏi props để tránh bị ghi đè khi spread {...others}
  const [local, others] = splitProps(props, [
    "onClick",
    "icon",
    "label",
    "color",
    "type",
  ]);

  const icon = () => local.icon || baseConfig().iconRefresh();
  const label = () => local.label;
  const color = () => local.color || ("neutral" as ButtonColor);
  const type = () => local.type || ("outline" as ButtonType);

  const handleRefresh = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (local.onClick) {
      await local.onClick(e);
    } else {
      await refresh();
    }
  };

  return (
    <DatatableButton
      {...others} // Các props còn lại như class, disabled...
      icon={icon()}
      label={label()}
      color={color()}
      type={type()}
      onClick={handleRefresh}
    />
  );
}
