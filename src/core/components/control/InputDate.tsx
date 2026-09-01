import { mergeClass } from '@core/helpers/class';
import { formatDatetime, fromClientZonedDate, normalizeDate, parseDate, toClientZonedDate } from '@core/helpers/date';
import { checkMobileOrTablet } from '@core/helpers/device';
import { mergeRef } from '@core/helpers/ref';
import { EventHandler, FocusEventHandler } from '@core/types/jsx';
import { endOfDay, startOfDay } from 'date-fns';
import { Ref, Show, createEffect, createSignal, onCleanup, onMount, splitProps, untrack } from 'solid-js';
import { Floating, getOrigin } from '../floating/Floating';
import { Datepicker, DatepickerProps } from './Datepicker';
import { InputWrapper, InputWrapperProps } from './InputWrapper';
import { IMask, MaskedInput } from './MaskedInput';
import { createControl } from './createControl';

// ── Types ──────────────────────────────────────────────────────────────────────

/** `date` — date only | `datehour` — date + hour | `datetime` — date + hour + minute */
export type InputDateMode = 'date' | 'datehour' | 'datetime';

/**
 * Only applies when `mode='date'`.
 * Controls what time is emitted with the selected date.
 * - `asIs`       — 00:00:00.000 (result of parsing, unspecified parts = midnight)
 * - `startOfDay` — 00:00:00.000 (explicit)
 * - `endOfDay`   — 23:59:59.999
 */
export type InputDateDayBoundary = 'asIs' | 'startOfDay' | 'endOfDay';

export interface InputDateProps
  extends FormControlProps<Date | null>,
  Omit<InputWrapperProps, 'onClear'>,
  Pick<DatepickerProps, 'minDate' | 'maxDate'> {
  mode?: InputDateMode;
  dayBoundary?: InputDateDayBoundary;
  dateFormat?: string;
  inputRef?: Ref<HTMLInputElement>;
  iconDate?: JSX.Element;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_FORMATS: Record<InputDateMode, string> = {
  date: 'dd-MM-yyyy',
  datehour: 'dd-MM-yyyy HH',
  datetime: 'dd-MM-yyyy HH:mm',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function InputDate(props: InputDateProps) {
  let inputRef: Ref<HTMLInputElement>;
  let ref: Ref<HTMLDivElement>;

  const [wrapperProps, _inputProps] = splitProps(props, [
    'class',
    'prefix',
    'prefixClass',
    'icon',
    'iconClass',
    'suffix',
    'suffixClass',
    'endIcon',
    'endIconClass',
    'ref',
    'onWrapperFocus',
    'onWrapperBlur',
  ]);

  const { id, name, value, onChange, readOnly, error, hasInited } =
    createControl<Date | null>('date', props);

  // inputMode is treated as static config (read once at init, not reactive)
  const inputMode: InputDateMode = props.mode ?? 'date';
  const dateFormat = () => props.dateFormat ?? DEFAULT_FORMATS[inputMode];

  const clearable = () => props.clearable && !!value();
  const [inputText, setInputText] = createSignal('');
  const [parsedDate, setParsedDate] = createSignal<Date | null>(null);
  const [focused, setFocused] = createSignal(false);
  const [openDatepicker, setOpenDatepicker] = createSignal(false);
  // REVIEW-2026-09-01.md §A.12 fix-adjacent find: a public page's form-embed (Hương Việt's
  // booking form, rendered inside a `client:visible` island) threw "Hydration Mismatch" for
  // this field's <Floating> specifically, visibly leaking "[object Object]" into the page.
  // `Floating.tsx` already special-cases SSR (returns null when `!props.reference`, since the
  // wrapper's ref callback never fires server-side — see that file's own long comment on this
  // exact class of bug). The gap that comment's fix doesn't cover: on the CLIENT's hydration
  // pass, `ref` (set by `InputWrapper`'s ref callback a few lines above `<Floating>` in the JSX)
  // is already assigned by the time `<Floating>` evaluates — so hydration's first client render
  // produces REAL floating content where the server produced none, which is a genuine
  // SSR/client mismatch, not a false positive. Gating `<Floating>` behind a `mounted` signal
  // (false until `onMount`, which only fires once hydration has fully completed) makes the
  // client's first hydration pass match the server's null too — the popover then appears a
  // frame later, on the next reactive tick, same UX (it's not visible until a real user click
  // opens it) with zero effect on `Floating.tsx` itself or every OTHER component that renders
  // one.
  const [mounted, setMounted] = createSignal(false);
  onMount(() => setMounted(true));

  const placeholder = () =>
    props.placeholder || (focused() ? dateFormat().toUpperCase() : '');

  // ── Emit helpers ─────────────────────────────────────────────────────────────

  /** Applies dayBoundary (date mode only) then calls onChange */
  const emitDate = (date: Date | null) => {
    if (!date) { onChange(null); return; }
    if (inputMode === 'date') {
      if (props.dayBoundary === 'startOfDay') { onChange(startOfDay(date)); return; }
      if (props.dayBoundary === 'endOfDay') { onChange(endOfDay(date)); return; }
    }
    onChange(date);
  };

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Sync external value → displayed text
  // Normalize trước để xử lý string/UTC/offset/bare-date từ API → Date theo CLIENT_TZ
  createEffect(() => {
    const raw = value();
    untrack(() => {
      if (raw !== undefined) {
        const date = raw instanceof Date ? raw : normalizeDate(raw as any);
        if (date) {
          const formatted = formatDatetime(date, dateFormat());
          if (formatted !== inputText()) setInputText(formatted);
        } else {
          setInputText('');
        }
      }
    });
  });

  // Parse typed text → internal date + emit khi input đầy đủ
  // parseDate dùng CLIENT_TZ → wall-clock user nhập = giờ địa phương
  createEffect(() => {
    const text = inputText();
    untrack(() => {
      if (!text) { setParsedDate(null); return; }
      const date = parseDate(text, dateFormat(), new Date());
      setParsedDate(date);
      if (date && text.length === dateFormat().length) {
        emitDate(date);
      }
    });
  });

  // Reset khi picker đóng mà không có giá trị hợp lệ
  createEffect(() => {
    if (
      !openDatepicker() &&
      hasInited() &&
      !value() &&
      (!parsedDate() || inputText().length !== dateFormat().length)
    ) {
      setInputText('');
      emitDate(null);
    }
  });

  // ── Mask ────────────────────────────────────────────────────────────────────

  const InputMask = (() => {
    if (inputMode === 'date') {
      return MaskedInput({
        mask: Date,
        pattern: 'd{-}`m{-}`Y',
        blocks: {
          d: { mask: IMask.MaskedRange, from: 1, to: 99, maxLength: 2 },
          m: { mask: IMask.MaskedRange, from: 1, to: 99, maxLength: 2 },
          Y: { mask: IMask.MaskedRange, from: 1900, to: 2999 },
        },
        // format và parse đều dùng CLIENT_TZ thông qua các helper đã fix
        format: (d: Date | null) => formatDatetime(d, 'dd-MM-yyyy'),
        parse: (s: string) => parseDate(s, 'dd-MM-yyyy', new Date()),
        min: startOfDay(props.minDate ?? new Date(1900, 0, 1)),
        max: endOfDay(props.maxDate ?? new Date(2999, 0, 1)),
        autofix: true,
        lazy: true,
        overwrite: true,
      });
    }

    // datehour / datetime — pattern-based mask
    const withMinutes = inputMode === 'datetime';
    return MaskedInput({
      mask: withMinutes ? 'd{-}m{-}Y{ }H{:}N' : 'd{-}m{-}Y{ }H',
      blocks: {
        d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2 },
        m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2 },
        Y: { mask: IMask.MaskedRange, from: 1900, to: 2999 },
        H: { mask: IMask.MaskedRange, from: 0, to: 23, maxLength: 2 },
        ...(withMinutes ? { N: { mask: IMask.MaskedRange, from: 0, to: 59, maxLength: 2 } } : {}),
      },
      lazy: true,
      overwrite: true,
    });
  })();

  // ── Event handlers ────────────────────────────────────────────────────────────

  const handleFocus: FocusEventHandler<HTMLInputElement, FocusEvent> = (e) => {
    setFocused(true);
    setOpenDatepicker(true);
    props.onFocus?.(e);
  };

  const handleBlur: FocusEventHandler<HTMLInputElement, FocusEvent> = (e) => {
    setFocused(false);
    props.onBlur?.(e);
  };

  const handleKeyDown: EventHandler<HTMLInputElement, KeyboardEvent> = (e) => {
    if (e.key === 'Tab') {
      setOpenDatepicker(false);
    } else if (
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '/', 'ArrowDown'].includes(e.key)
    ) {
      setOpenDatepicker(true);
      const text = inputText();
      if (e.key === '-' || e.key === '/') {
        if (text.length === 1) setInputText('0' + text + '-');
        else if (text.length === 4) setInputText(text.slice(0, 3) + '0' + text.slice(3) + '-');
      }
    }
  };

  const handleKeyUp: EventHandler<HTMLInputElement, KeyboardEvent> = (_e) => {
    const text = inputText();
    const splits = text.split('-').filter(Boolean);
    if (splits.length === 1) {
      if (Number(splits[0]) > 31) setInputText('31' + text.slice(2));
    } else if (splits.length === 2) {
      if (Number(splits[1]) > 12) setInputText(text.slice(0, 3) + '12' + text.slice(6));
    } else if (splits.length >= 3) {
      const month = Number(splits[1]);
      const day = Number(splits[0]);
      if (month === 2 && day > 29) {
        setInputText('28-' + splits[1] + text.slice(6));
      } else if ([4, 6, 9, 11].includes(month) && day > 30) {
        setInputText('30-' + splits[1] + text.slice(6));
      }
    }
    setInputText(inputText);
  };

  /**
   * Calendar date selection — preserves current time cho datehour/datetime.
   *
   * Khi user click ngày trên calendar:
   * - `date` từ Datepicker là Date với wall-clock = ngày được click lúc midnight LOCAL
   * - Nếu có parsedDate (user đã gõ giờ), ta giữ lại giờ phút đó
   * - Dùng toClientZonedDate để đọc giờ phút theo CLIENT_TZ
   * - Dùng fromClientZonedDate để build lại UTC Date đúng
   */
  const handleDateSelect = (date: Date | null) => {
    if (!date) { emitDate(null); setOpenDatepicker(false); return; }

    if (inputMode !== 'date' && parsedDate()) {
      // Đọc wall-clock của parsedDate theo CLIENT_TZ
      const zonedParsed = toClientZonedDate(parsedDate());
      const h = zonedParsed?.getHours() ?? 0;
      const m = zonedParsed?.getMinutes() ?? 0;

      // Đọc wall-clock của ngày được chọn theo CLIENT_TZ
      const zonedSelected = toClientZonedDate(date)!;
      // Set giờ phút vào ngày được chọn (vẫn là zoned Date)
      zonedSelected.setHours(h);
      zonedSelected.setMinutes(m);
      zonedSelected.setSeconds(0);
      zonedSelected.setMilliseconds(0);

      // Convert lại về UTC Date để emit
      date = fromClientZonedDate(zonedSelected)!;
    }

    emitDate(date);
    // Giữ picker mở cho datetime/datehour để user chỉnh thêm giờ
    if (inputMode === 'date') setOpenDatepicker(false);
  };

  const inputDateClass = () =>
    mergeClass(
      'flex-1 w-full h-auto px-2 bg-transparent font-normal text-base rounded-inherit focus:outline-hidden min-w-0',
      props.class,
    );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <InputWrapper
        {...wrapperProps}
        ref={mergeRef(props.ref, (el) => (ref = el))}
        endIcon={props.iconDate}
        error={error()?.toString()}
        readOnly={readOnly()}
        maxLength={props.maxLength}
        clearable={clearable()}
        onClear={() => {
          emitDate(null);
          (inputRef as HTMLElement).focus();
          setTimeout(() => setOpenDatepicker(true));
        }}
      >
        <InputMask
          inputMode="numeric"
          maxLength={props.maxLength}
          class={inputDateClass()}
          tabIndex={props.skipTabIndex ? -1 : 0}
          name={name()}
          ref={mergeRef(props.inputRef, (el) => (inputRef = el))}
          id={id()}
          autocomplete="off"
          readOnly={readOnly()}
          placeholder={placeholder()}
          value={inputText()}
          onInput={(e) => setInputText((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {props.children}
      </InputWrapper>

      <Show when={mounted()}>
        <Floating
          class="rounded-md border border-neutral-200 bg-white px-0 py-0 shadow-2xs"
          trigger="click"
          placement="bottom-start"
          offset={4}
          reference={ref! as Ref<HTMLElement>}
          persistOnReferenceClick
          animationDuration={75}
          open={openDatepicker()}
          onOpen={setOpenDatepicker}
          inactiveClass={({ placement }) =>
            `transition duration-75 ease-in-out translate-x-0 -translate-y-2 opacity-0 ${getOrigin(placement)}`
          }
          activeClass={() => 'opacity-100 translate-x-0 translate-y-0'}
        >
          <div>
            <Datepicker
              currentDate={parsedDate()}
              selectedDate={parsedDate()}
              onSelectDate={handleDateSelect}
              class="w-72 p-0"
              minDate={props.minDate && startOfDay(props.minDate)}
              maxDate={props.maxDate && endOfDay(props.maxDate)}
            />
            <Show when={inputMode !== 'date'}>
              <TimeStrip
                mode={inputMode as 'datehour' | 'datetime'}
                date={parsedDate()}
                onChange={(d) => emitDate(d)}
              />
            </Show>
          </div>
        </Floating>
      </Show>
    </>
  );
}

// ── Time Strip ────────────────────────────────────────────────────────────────

function TimeStrip(props: {
  mode: 'datehour' | 'datetime';
  date: Date | null;
  onChange: (date: Date) => void;
}) {
  const base = () => new Date(props.date ?? startOfDay(new Date()));

  const setHour = (h: number) => {
    const d = base();
    d.setHours(h);
    props.onChange(d);
  };

  const setMinute = (m: number) => {
    const d = base();
    d.setMinutes(m);
    props.onChange(d);
  };

  return (
    <div class="border-t border-neutral-100 bg-white rounded-b-md px-4 py-2.5">
      <div class="flex items-center justify-center gap-2">
        <svg class="w-3.5 h-3.5 text-neutral-400 shrink-0 self-center" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>

        <TimeSpinner value={props.date?.getHours() ?? 0} max={23} onChange={setHour} />

        <Show when={props.mode === 'datetime'}>
          <span class="font-mono text-base font-bold text-neutral-400 select-none self-center pb-[22px]">:</span>
          <TimeSpinner value={props.date?.getMinutes() ?? 0} max={59} onChange={setMinute} />
        </Show>
      </div>
    </div>
  );
}

// ── Time Spinner ──────────────────────────────────────────────────────────────

const isMobileDevice = checkMobileOrTablet();

function TimeSpinner(props: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  let divEl!: HTMLDivElement;
  let inputEl!: HTMLInputElement;
  const [editing, setEditing] = createSignal(false);

  const wrap = (v: number) => ((v % (props.max + 1)) + props.max + 1) % (props.max + 1);

  const up = () => {
    const nv = wrap(props.value + 1);
    props.onChange(nv);
    return nv;
  };
  const down = () => {
    const nv = wrap(props.value - 1);
    props.onChange(nv);
    return nv;
  };

  createEffect(() => {
    const v = props.value;
    untrack(() => {
      if (!editing() && inputEl) {
        inputEl.value = String(v).padStart(2, '0');
      }
    });
  });

  onMount(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const nv = e.deltaY < 0 ? up() : down();
      if (editing()) inputEl.value = String(nv).padStart(2, '0');
    };
    divEl.addEventListener('wheel', onWheel, { passive: false });
    onCleanup(() => divEl.removeEventListener('wheel', onWheel));
  });

  const commit = () => {
    const val = parseInt(inputEl.value, 10);
    const clamped = isNaN(val) ? props.value : Math.min(props.max, Math.max(0, val));
    props.onChange(clamped);
    inputEl.value = String(clamped).padStart(2, '0');
  };

  const btnClass =
    'w-8 h-5 rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 ' +
    'flex items-center justify-center text-[10px] leading-none transition-colors';

  return (
    <div ref={divEl} class="flex flex-col items-center gap-0.5 select-none">
      <button
        type="button"
        class={btnClass}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const nv = up();
          if (editing()) inputEl.value = String(nv).padStart(2, '0');
        }}
      >▲</button>

      <input
        ref={inputEl}
        type="text"
        inputMode={isMobileDevice ? 'none' : 'numeric'}
        readOnly={isMobileDevice}
        class="w-10 h-8 text-center font-mono text-sm font-semibold text-neutral-700
               border border-neutral-200 rounded-md tabular-nums bg-white
               focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
        onFocus={() => {
          if (isMobileDevice) return;
          setEditing(true);
          requestAnimationFrame(() => inputEl?.select());
        }}
        onBlur={() => {
          if (isMobileDevice) return;
          setEditing(false);
          commit();
        }}
        onInput={() => {
          if (isMobileDevice) return;
          const cleaned = inputEl.value.replace(/\D/g, '').slice(-2);
          if (inputEl.value !== cleaned) inputEl.value = cleaned;
        }}
        onKeyDown={(e: KeyboardEvent) => {
          if (isMobileDevice) return;
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            inputEl.value = String(up()).padStart(2, '0');
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            inputEl.value = String(down()).padStart(2, '0');
          } else if (e.key === 'Enter') {
            e.preventDefault();
            inputEl.blur();
          }
        }}
      />

      <button
        type="button"
        class={btnClass}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const nv = down();
          if (editing()) inputEl.value = String(nv).padStart(2, '0');
        }}
      >▼</button>
    </div>
  );
}