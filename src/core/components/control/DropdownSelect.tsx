import { mergeClass } from "@core/helpers/class";
import { getBackgroundColor } from "@core/helpers/color";
import { mergeRef } from "@core/helpers/ref";
import { EventHandler, FocusEventHandler } from "@core/types/jsx";
import { For, Ref, Show, createSignal } from "solid-js";
import { Floating, getOrigin } from "../floating/Floating";
import { Img } from "../utilities/Img";
import { OptionGroup, RenderFunction, SelectDropdownProps } from "./Select";

export interface DropdownSelectProps<OptionType = any, ItemType = any>
  extends SelectDropdownProps<OptionType, ItemType>,
  BaseProps,
  FormControlProps<OptionType> {
  options: Option<OptionType, ItemType>[];
  optionGroups: OptionGroup<OptionType, ItemType>[];
  emptyPlaceholder: string;
  emptyOptionsPlaceholder: string;
  instructionPlaceholder: string;
  clearable?: boolean;
  renderFn?: RenderFunction<OptionType, ItemType>;
  ref?: Ref<HTMLDivElement>;
  inputRef?: Ref<HTMLInputElement>;
  inputText: string;
  maxDropdownHeight?: string;
  onInputTextChange: (input: string) => any;
  onScrollToBottom: (lastOption: Option) => any;
}

const ANIMATION_DURATION = 50;

export function DropdownSelect<OptionType, ItemType>(
  props: DropdownSelectProps<OptionType, ItemType>
) {
  let inputRef: Ref<HTMLInputElement>;
  let selectContainerRef: Ref<HTMLDivElement>; // Container của list options
  let wrapperRef: Ref<HTMLDivElement>; // Container của input + tags
  const [openDropdown, setOpenDropdown] = createSignal(false);
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
  const [focused, setFocused] = createSignal(false);

  // Helper lấy danh sách item đang chọn (từ options đã được Select.tsx merge)
  const selectedItems = () => {
    if (props.value === null || props.value === undefined || props.value === "")
      return [];
    if (props.multi && Array.isArray(props.value)) {
      return props.value
        .map((val) => props.options.find((opt) => opt.value === val))
        .filter((item) => !!item);
    }
    const found = props.options.find((x) => x.value === props.value);
    return found ? [found] : [];
  };

  const hasSelection = () => selectedItems().length > 0;

  // Xóa Tag
  const handleRemoveTag = (valToRemove: any, e: MouseEvent) => {
    e.stopPropagation(); // Không mở dropdown
    e.preventDefault();
    if (Array.isArray(props.value)) {
      const newValue = props.value.filter((v) => v !== valToRemove);
      props.onChange?.(newValue as any);
    }
    // Giữ focus vào input sau khi xóa
    (inputRef as HTMLInputElement)?.focus();
  };

  // Chọn Option
  const handleSelectOption = (option: any) => {
    props.onChange?.(option.value);

    if (props.multi) {
      // Multi: Giữ dropdown mở, clear text search, focus lại input
      props.onInputTextChange("");
      (inputRef as HTMLInputElement)?.focus();
      // Đảm bảo dropdown vẫn mở (đôi khi sự kiện click làm mất focus)
      setOpenDropdown(true);
    } else {
      // Single: Đóng dropdown ngay lập tức
      setOpenDropdown(false);
      // Clear text search để hiển thị label overlay
      props.onInputTextChange("");
      (inputRef as HTMLInputElement)?.blur(); // Blur để đóng bàn phím ảo trên mobile
    }
  };

  const handleKeyDown: EventHandler<HTMLElement, KeyboardEvent> = (e) => {
    let index = highlightedIndex();
    switch (e.key) {
      case "ArrowDown": {
        if (!openDropdown()) {
          setOpenDropdown(true);
          return;
        }
        if (index < props.options?.length - 1) {
          setHighlightedIndex((index) => index + 1);
          scrollToHighlighted();
        }
        break;
      }
      case "ArrowUp": {
        if (!openDropdown()) {
          setOpenDropdown(true);
          return;
        }
        if (index > 0) {
          setHighlightedIndex((index) => index - 1);
          scrollToHighlighted();
        }
        break;
      }
      case "Enter": {
        if (
          openDropdown() &&
          index >= 0 &&
          index <= props.options?.length - 1
        ) {
          let option: Option | null = null;
          // Logic tìm option trong groups
          if (props.optionGroups.length) {
            let tempIndex = index;
            for (const group of props.optionGroups) {
              if (tempIndex < group.options.length) {
                option = group.options[tempIndex] as any;
                break;
              }
              tempIndex -= group.options.length;
            }
          } else {
            option = props.options[index];
          }

          if (option) {
            handleSelectOption(option);
            e.preventDefault();
          }
        } else {
          setOpenDropdown(true);
        }
        break;
      }
      case "Tab":
      case "Escape": {
        setOpenDropdown(false);
        break;
      }
      case "Backspace": {
        if (
          props.multi &&
          !props.inputText &&
          Array.isArray(props.value) &&
          props.value.length > 0
        ) {
          // Xóa tag cuối cùng
          const newValue = props.value.slice(0, -1);
          props.onChange?.(newValue as any);
        }
        break;
      }
    }
  };

  const scrollToHighlighted = () => {
    const el = (selectContainerRef as HTMLDivElement)?.querySelector(
      ".is-highlighted"
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const handleFocus: FocusEventHandler<HTMLElement, FocusEvent> = (e) => {
    setFocused(true);
    setOpenDropdown(true);
    props.onFocus?.(e);
  };

  const handleBlur: FocusEventHandler<HTMLElement, FocusEvent> = (e) => {
    setFocused(false);
    props.onBlur?.(e);
    // onMouseDown trên options dùng e.preventDefault() nên blur có thể chạy
    // sau khi handleSelectOption đã đóng dropdown (setOpenDropdown=false).
    // Timeout 150ms đủ để onMouseDown/handleSelectOption hoàn tất trước khi blur close.
    setTimeout(() => {
      setOpenDropdown(false);
      props.onInputTextChange("");
    }, ANIMATION_DURATION * 3);
  };

  // --- CLASSES ---
  // Container chính bao bọc tags và input
  const wrapperClass = () =>
    mergeClass(
      "relative flex flex-wrap items-center w-full  px-1 gap-1 cursor-text",
      props.class
    );

  // Input: flex-1 để chiếm phần còn lại, min-width để luôn gõ được
  const inputClass = () =>
    mergeClass(
      "flex-1 min-w-[50px] bg-transparent outline-none border-none py-1 px-1 text-sm text-neutral-700",
      props.readOnly && "pointer-events-none",
      // Ẩn text input nếu Single Select đã chọn (để hiện Overlay)
      !props.multi && hasSelection() && !props.inputText && "opacity-0"
    );

  // Overlay cho Single Select
  const overlayClass = () =>
    mergeClass(
      "absolute inset-0 flex items-center px-3 pointer-events-none text-neutral-700 whitespace-nowrap overflow-hidden",
      props.inputText || (props.multi && hasSelection())
        ? "opacity-0"
        : "opacity-100"
    );

  const isSelected = (val: any) => {
    if (props.multi && Array.isArray(props.value))
      return props.value.includes(val);
    return props.value === val;
  };

  return (
    <>
      <div
        ref={mergeRef(props.ref, (el) => (wrapperRef = el))}
        class={wrapperClass()}
        onClick={(e) => {
          // Click vào khoảng trắng -> Focus input -> Mở dropdown
          if (e.target === wrapperRef || e.target === inputRef) {
            (inputRef as HTMLInputElement)?.focus();
            setOpenDropdown(true);
          }
        }}
      >
        {/* --- TAGS (Multi) --- */}
        <Show when={props.multi && hasSelection()}>
          <For each={selectedItems()}>
            {(item) => (
              <div class="inline-flex items-center px-2 py-0.5 rounded text-sm bg-blue-50 text-blue-700 border border-blue-200 max-w-full">
                <span class="truncate max-w-[150px]">
                  {item?.label || item?.value}
                </span>
                <div
                  class="ml-1 cursor-pointer p-0.5 rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-900"
                  onMouseDown={(e) => handleRemoveTag(item?.value, e)}
                >
                  <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L10 10 5.707 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
            )}
          </For>
        </Show>

        {/* --- INPUT --- */}
        <input
          ref={mergeRef(props.inputRef, (el) => (inputRef = el))}
          id={props.id + "-input"}
          class={inputClass()}
          readOnly={props.readOnly}
          tabIndex={props.readOnly || props.disabled ? -1 : 0}
          autocomplete="off"
          placeholder={
            hasSelection()
              ? ""
              : focused()
                ? props.instructionPlaceholder
                : props.emptyPlaceholder
          }
          value={props.inputText}
          onInput={(e) => {
            props.onInputTextChange(e.target.value);
            setOpenDropdown(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {/* --- OVERLAY (Single) --- */}
        <Show when={!props.multi && hasSelection()}>
          <div class={overlayClass()}>
            <RenderedOption
              item={selectedItems()[0]}
              state={{ isInDropdown: false }}
              {...props}
            />
          </div>
        </Show>
      </div>

      <Floating
        // Quan trọng: Reference vào wrapperRef để dropdown rộng bằng cả khung input+tags
        reference={wrapperRef! as Ref<HTMLElement>}
        style={{
          "min-width": (wrapperRef! as HTMLElement)?.offsetWidth + "px",
        }}
        trigger="click"
        offset={4}
        strategy="fixed"
        autoSize
        allowedPlacements={["bottom", "top"]}
        persistOnReferenceClick
        animationDuration={ANIMATION_DURATION}
        open={openDropdown()}
        onOpen={setOpenDropdown}
        class="max-h-96 rounded-lg border border-neutral-200 bg-white shadow-sm z-50"
        inactiveClass={({ placement }) =>
          `transition duration-50 ease-in-out translate-x-0 -translate-y-2 opacity-0 ${getOrigin(
            placement
          )}`
        }
        activeClass={() => `opacity-100 translate-x-0 translate-y-0`}
      >
        <div
          ref={(el) => (selectContainerRef = el)}
          style={{ "max-height": props.maxDropdownHeight || "50vh" }}
          class="flex scrollbar-custom max-h-inherit flex-col overflow-auto rounded-inherit"
          onScroll={(e) => {
            const t = e.target as HTMLElement;
            if (t.scrollHeight - t.scrollTop <= t.clientHeight + 16) {
              const last = props.options[props.options.length - 1];
              if (last) props.onScrollToBottom(last);
            }
          }}
        >
          {props.optionGroups.length ? (
            <For each={props.optionGroups}>
              {(optGroup) => (
                <>
                  <div class="px-2 py-1.5 text-xsm font-semibold text-neutral uppercase bg-gray-50/50">
                    {optGroup.group}
                  </div>
                  <For each={optGroup.options}>
                    {(option, index) => (
                      <SelectOption
                        {...props}
                        option={option as any}
                        isSelected={isSelected(option.value)}
                        isHighlighted={
                          highlightedIndex() === optGroup.offset + index()
                        }
                        onClick={() => handleSelectOption(option)}
                        onMouseEnter={() =>
                          setHighlightedIndex(optGroup.offset + index())
                        }
                      />
                    )}
                  </For>
                </>
              )}
            </For>
          ) : props.options.length ? (
            <For each={props.options}>
              {(option, index) => (
                <SelectOption
                  {...props}
                  option={option}
                  isSelected={isSelected(option.value)}
                  isHighlighted={highlightedIndex() === index()}
                  onClick={() => handleSelectOption(option)}
                  onMouseEnter={() => setHighlightedIndex(index())}
                />
              )}
            </For>
          ) : (
            <div class="px-3.5 py-2.5 text-center text-neutral-300 italic text-sm">
              {props.emptyOptionsPlaceholder}
            </div>
          )}
        </div>
      </Floating>
    </>
  );
}

// --- SUB COMPONENTS ---

function SelectOption<OptionType, ItemType>(
  props: {
    option: Option<OptionType, ItemType>;
    isSelected: boolean;
    isHighlighted: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
  } & DropdownSelectProps<OptionType>
) {
  const optionClass = () =>
    mergeClass(
      "flex items-center justify-between py-2 px-3.5 cursor-pointer text-sm transition-colors",
      props.isHighlighted ? "bg-gray-50" : "bg-white",
      // Màu sắc khi select
      props.isSelected && !props.multi
        ? "bg-blue-50 text-blue-700 font-medium" // Single
        : props.isSelected
          ? "bg-blue-50"
          : "", // Multi
      props.class
    );

  return (
    <div
      class={optionClass()}
      // Sử dụng onMouseDown để tránh việc blur input trước khi click được xử lý
      onMouseDown={(e) => {
        e.preventDefault();
        props.onClick();
      }}
      onMouseMove={props.onMouseEnter}
    >
      <div class="flex-1 min-w-0">
        <RenderedOption
          item={props.option}
          state={{ isHighlighted: props.isHighlighted, isInDropdown: true }}
          {...props}
        />
      </div>

      {/* Icon Check cho Multi Select */}
      <Show when={props.multi && props.isSelected}>
        <span class="text-blue-600 ml-3 flex shrink-0">
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </Show>

      {/* Icon Check cho Single Select (Nếu muốn) */}
      <Show when={!props.multi && props.isSelected}>
        <span class="text-blue-600 ml-3 flex shrink-0">
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </Show>
    </div>
  );
}

function RenderedOption<OptionType, ItemType>(
  props: {
    item: Parameters<RenderFunction<OptionType, ItemType>>[0];
    state: Parameters<RenderFunction<OptionType, ItemType>>[1];
  } & DropdownSelectProps<OptionType, ItemType>
) {
  return (
    <Show when={props.item} keyed>
      {(item) => (
        <Show
          when={!props.renderFn}
          fallback={props.renderFn!(item, props.state)}
        >
          <div class={`flex w-full items-center gap-2 overflow-hidden`}>
            {props.hasColor && (
              <div
                class={`mr-1.5 box-content h-2 w-2 rounded-full border-2 border-white ${getBackgroundColor(
                  item.color
                )}`}
              ></div>
            )}
            {(props.hasImage || props.hasAvatar) && (
              <Img
                square
                bordered
                ratio={props.ratio}
                class={`${props.multi ? "w-6 h-6" : "w-7 h-7"} ${props.imageClass || ""
                  }`}
                isAvatar={props.hasAvatar}
                src={item.image}
                alt={typeof item.label == "string" ? item.label : ""}
              />
            )}
            <div class="flex flex-col min-w-0">
              <span
                class={`truncate ${props.state.isInDropdown && props.hasSubtext
                    ? "font-medium"
                    : ""
                  }`}
              >
                {item.label}
              </span>
              {props.state.isInDropdown && props.hasSubtext && (
                <span class="text-xs text-neutral-500 truncate">
                  {item.subText}
                </span>
              )}
            </div>
          </div>
        </Show>
      )}
    </Show>
  );
}
