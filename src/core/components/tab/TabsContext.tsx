import { Accessor, createContext, useContext } from 'solid-js';
import { TabProps } from './Tab';

export const TabsContext = createContext<{
  currentTabIndex: Accessor<number>;
  registerTab: (props: TabProps) => number;
}>();

export const useTab = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('No Context: Tabs');
  }
  return context;
};
