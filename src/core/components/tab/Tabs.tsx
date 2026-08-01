
import { For, Show, createEffect, createSignal, onMount } from 'solid-js';
import { Tab, TabProps } from './Tab';
import { TabsContext } from './TabsContext';
import { mergeClass } from '@/core/helpers/class';

const INKBAR_DELAY_DURATION = 300;
export interface TabsProps extends BaseProps {
  labelContainerClass?: string;
  labelClass?: string;
  contentClass?: string;
  delayInkbar?: boolean;
}
export function Tabs(props: TabsProps) {
  let ref: HTMLDivElement;
  const [currentTabIndex, setCurrentTabIndex] = createSignal(-1);
  const [shouldShowInkbar, setShouldShowInkbar] = createSignal(false);
  // const resolvedChildren = children(() => props.children);
  // const tabs = () =>
  //   resolvedChildren
  //     .toArray()
  //     .filter((item: any) => item.isTab) as unknown as TabProps[];
  // const tabs = () => [];
  const [tabs, setTabs] = createSignal<TabProps[]>([]);

  const tabsClass = () => mergeClass(`flex-col-center w-auto`, props.class);
  const labelContainerClass = () =>
    mergeClass(
      `flex gap-2 relative w-full`,
      `overflow-x-auto scrollbar-hidden`,
      props.labelContainerClass,
    );
  const labelClass = (index: number) =>
    mergeClass(
      `px-4 pt-2.5 pb-3 flex gap-1.5 border rounded-sm font-medium cursor-pointer border-transparent whitespace-nowrap tab-${index}`,
      index == currentTabIndex()
        ? `bg-white text-main hover:text-main-600 border-neutral-100 border-b-neutral-200`
        : `hover:bg-main-50 bg-white/75 hover:text-main border-transparent hover:border-main-100`,
      props.labelClass,
    );
  const contentClass = () => mergeClass(`mt-2 w-full`, props.contentClass);

  const currentTabEl = () => {
    return ref.querySelector(`.tab-${currentTabIndex()}`) as HTMLDivElement;
  };

  createEffect(() => {
    if (props.id && currentTabIndex() >= 0) {
      sessionStorage.setItem(
        `${props.id}-tab-index`,
        currentTabIndex().toString(),
      );
    }
  });

  onMount(() => {
    if (props.id) {
      try {
        const tabIndex = Number(
          sessionStorage.getItem(`${props.id}-tab-index`),
        );
        if (
          tabIndex !== undefined &&
          tabIndex >= 0 &&
          tabIndex <= tabs().length - 1
        ) {
          setCurrentTabIndex(tabIndex);
        } else {
          setCurrentTabIndex(0);
        }
      } catch (err) {
        setCurrentTabIndex(0);
      }
    } else {
      setCurrentTabIndex(0);
    }
    if (props.delayInkbar) {
      setTimeout(() => {
        setShouldShowInkbar(true);
      }, INKBAR_DELAY_DURATION);
    } else {
      setShouldShowInkbar(true);
    }
  });

  const registerTab = (tab: TabProps) => {
    const index = tabs().findIndex((x) => x.label == tab.label);
    if (index === -1) {
      setTabs((tabs) => [...tabs, tab]);
      return tabs().length - 1;
    }
    return -1;
  };

  return (
    <TabsContext.Provider value={{ registerTab, currentTabIndex }}>
      <div class={tabsClass()}>
        <div class={labelContainerClass()} ref={(el) => (ref = el)}>
          <For each={tabs()}>
            {(tab, index) => (
              <div
                class={labelClass(index())}
                onClick={() => setCurrentTabIndex(index)}
              >
                {tab.icon}
                {tab.label}
              </div>
            )}
          </For>
          <Show when={shouldShowInkbar()}>
            <div
              class="bg-main absolute bottom-0.5 z-10 h-0.75 rounded-full transition-all ease-in-out"
              style={{
                width: currentTabEl()?.offsetWidth - 6 + 'px',
                left: currentTabEl()?.offsetLeft + 3 + 'px',
              }}
            ></div>
          </Show>
        </div>
        <div class={contentClass()}>{props.children}</div>
      </div>
    </TabsContext.Provider>
  );
}
Tabs.Tab = Tab;
