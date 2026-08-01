import { Show } from 'solid-js';
import { useTab } from './TabsContext';

export interface TabProps extends BaseProps {
  label: string | JSX.Element;
  icon?: JSX.Element;
}
export function Tab(props: TabProps) {
  const { registerTab, currentTabIndex } = useTab();
  const tabIndex = registerTab(props);

  return (
    <>
      <Show when={currentTabIndex() === tabIndex}>{props.children}</Show>
    </>
  );
}
