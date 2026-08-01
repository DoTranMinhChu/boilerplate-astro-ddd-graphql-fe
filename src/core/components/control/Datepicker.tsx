import { mergeClass } from '@core/helpers/class';
import { formatDatetime } from '@core/helpers/date';
import { EventHandler } from '@core/types/jsx';
import {
  addMonths,
  addWeeks,
  addYears,
  differenceInDays,
  differenceInWeeks,
  eachDayOfInterval,
  endOfDecade,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isSameYear,
  isWithinInterval,
  startOfDecade,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { For, Match, Show, Switch, createEffect, createSignal } from 'solid-js';
import { Button } from '../button/Button';
import { baseConfig } from '../config/BaseConfig';

export interface DatepickerProps extends BaseProps {
  weekdayNames?: string[];
  monthNames?: string[];
  prevIcon?: JSX.Element;
  nextIcon?: JSX.Element;
  selectMonthText?: string;
  selectYearText?: string;
  /** current selected date, nullable */
  selectionMode?: 'date' | 'range';
  selectedDate?: Date | null;
  selectedEndDate?: Date | null;
  minDate?: Date;
  maxDate?: Date;
  currentDate?: Date | null;
  onSelectDate?: (date: Date | null) => any;
  onSelectRange?: ({
    startDate,
    endDate,
  }: {
    startDate: Date | null;
    endDate: Date | null;
  }) => any;
  onClick?: EventHandler<HTMLDivElement, MouseEvent>;
}
export function Datepicker(props: DatepickerProps) {
  const today = () => new Date();
  const selectionMode = () => props.selectionMode || 'date';
  const [mode, setMode] = createSignal<'date' | 'month' | 'year'>('date');
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = createSignal<Date | null>(null);
  const [inRangeDates, setInRangeDates] = createSignal<string[]>([]);
  const [hoveredDate, setHoveredDate] = createSignal<Date | null>(null);
  const [currentDate, setCurrentDate] = createSignal<Date>(
    props.currentDate || today(),
  );
  const currentMonth = () => currentDate().getMonth();
  const currentMonthDate = () => {
    const month = currentMonth();
    const year = currentYear();
    const date = new Date(year, month);
    return startOfMonth(date);
  };
  const currentMonthName = () => monthNames()[currentMonth()];
  const currentYear = () => currentDate().getFullYear();
  const currentYearDate = () => {
    const year = currentYear();
    const date = new Date(year, 0);
    return startOfYear(date);
  };

  createEffect(() => {
    if (props.selectedDate !== undefined) setSelectedDate(props.selectedDate);
  });

  createEffect(() => {
    if (props.currentDate) {
      setCurrentDate(props.currentDate);
    }
  });

  const handlePrev = () => {
    switch (mode()) {
      case 'date': {
        setCurrentDate(addMonths(currentDate(), -1));
        break;
      }
      case 'month': {
        setCurrentDate(addYears(currentDate(), -1));
        break;
      }
      case 'year': {
        setCurrentDate(addYears(currentDate(), -10));
        break;
      }
    }
  };
  const handleNext = () => {
    switch (mode()) {
      case 'date': {
        setCurrentDate(addMonths(currentDate(), 1));
        break;
      }
      case 'month': {
        setCurrentDate(addYears(currentDate(), 1));
        break;
      }
      case 'year': {
        setCurrentDate(addYears(currentDate(), 10));
        break;
      }
    }
  };
  const handleSelectDate = (date: Date) => {
    if (selectionMode() == 'range' && selectedDate() && !selectedEndDate()) {
      const daysDifference = differenceInDays(selectedDate()!, date);
      if (daysDifference < 0) {
        setSelectedEndDate(date);
      } else {
        setSelectedDate(date);
        props.onSelectDate?.(date);
      }
    } else {
      if (selectionMode() == 'range') {
        setSelectedEndDate(null);
      }
      setSelectedDate(date);
      props.onSelectDate?.(date);
    }
    props.onSelectRange?.({
      startDate: selectedDate(),
      endDate: selectedEndDate(),
    });
  };
  const handleSelectMonth = (month: number) => {
    const date = new Date(currentDate());
    date.setMonth(month);
    setCurrentDate(date);
    setMode('date');
  };
  const handleSelectYear = (year: number) => {
    const date = new Date(currentDate());
    date.setFullYear(year);
    setCurrentDate(date);
    setMode('month');
  };

  const currentDates = () => {
    const date = new Date(currentDate());
    const startOfMonthDate = startOfMonth(date);
    const endOfMonthDate = endOfMonth(date);
    const startOfWeekDate = startOfWeek(startOfMonthDate);
    let endOfWeekDate = endOfWeek(endOfMonthDate);
    if (differenceInWeeks(endOfWeekDate, startOfWeekDate) < 5) {
      endOfWeekDate = addWeeks(endOfWeekDate, 1);
    }

    const dates = eachDayOfInterval({
      start: startOfWeekDate,
      end: endOfWeekDate,
    }).map((date) => ({
      date,
      isToday: isSameDay(date, today()),
      isCurrentMonth: date.getMonth() == currentMonth(),
      isDisabled:
        (props.minDate && date < props.minDate) ||
        (props.maxDate && date > props.maxDate) ||
        false,
    }));

    return dates;
  };
  const currentMonths = () => {
    const date = currentMonthDate();
    const selected = selectedDate();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(date);
      monthDate.setMonth(i);
      months.push({
        date: monthDate,
        isSelected: selected ? isSameMonth(monthDate, selected) : false,
        name: monthNames()[i],
        isThisMonth: isSameMonth(monthDate, today()),
      });
    }
    return months;
  };
  const currentYears = () => {
    const date = currentYearDate();
    const selected = selectedDate();
    const startOfDecadeDate = startOfDecade(date);
    const endOfDecadeDate = endOfDecade(date);
    const years = [];
    for (
      let i = startOfDecadeDate.getFullYear();
      i <= endOfDecadeDate.getFullYear();
      i++
    ) {
      const yearDate = new Date(date);
      yearDate.setFullYear(i);
      years.push({
        date: yearDate,
        year: i,
        isSelected: selected ? isSameYear(yearDate, selected) : false,
        isThisYear: isSameYear(yearDate, today()),
      });
    }
    return years;
  };

  const datepickerClass = () => mergeClass(props.class);

  const isInRange = (current: Date, start: Date | null, end: Date | null) => {
    try {
      return selectionMode() == 'range' && start && end
        ? isWithinInterval(current, { start, end })
        : false;
    } catch (err) {
      return false;
    }
  };
  createEffect(() => {
    const selected = selectedDate();
    const selectedEnd = selectedEndDate();
    const hovered = hoveredDate();
    if (hovered || selectedEnd) {
      const dates = currentDates();
      setInRangeDates(
        dates
          .filter((x) => isInRange(x.date, selected, selectedEnd || hovered))
          .map((x) => formatDatetime(x.date)),
      );
    } else {
      setInRangeDates([]);
    }
  });

  const DateItem = (props: {
    date: Date;
    isToday: boolean;
    isCurrentMonth: boolean;
    isSelected: boolean;
    isSelectedEnd: boolean;
    isInRange: boolean;
    isDisabled: boolean;
  }) => {
    const dateClass = () => {
      return mergeClass(
        `w-full h-full`,
        props.isCurrentMonth && `text-neutral-700 font-semibold`,
        props.isToday && `bg-main-50 text-main`,
        props.isInRange &&
          `bg-main-100 text-main hover:bg-main-200 hover:text-main-600`,
        props.isSelected || props.isSelectedEnd
          ? `bg-main text-white hover:bg-main-600 hover:text-white`
          : props.isInRange
            ? `rounded-none`
            : ``,
        props.isSelected && props.isInRange ? `rounded-r-none` : '',
        props.isSelectedEnd && `rounded-l-none`,
        props.isDisabled && `opacity-50 pointer-events-none`,
      );
    };

    return (
      <Button
        class={dateClass()}
        color={props.isSelected || props.isSelectedEnd ? 'main' : 'neutral'}
        type={props.isSelected || props.isSelectedEnd ? 'solid' : 'flat'}
        label={props.date.getDate()}
        onClick={() => handleSelectDate(props.date)}
        {...(selectionMode() == 'range'
          ? {
              onMouseEnter: () => {
                setHoveredDate(props.date);
              },
              onMouseLeave: () => {
                setHoveredDate(null);
              },
            }
          : {})}
      />
    );
  };

  const prevIcon = () => props.prevIcon || baseConfig().iconPrev();
  const nextIcon = () => props.nextIcon || baseConfig().iconNext();

  const selectMonthText = () =>
    props.selectMonthText || baseConfig()?.datepickerSelectMonthText || '';
  const selectYearText = () =>
    props.selectYearText || baseConfig()?.datepickerSelectYearText || '';
  const weekdayNames = () =>
    props.weekdayNames || baseConfig()?.datepickerWeekdayNames || [];
  const monthNames = () =>
    props.monthNames || baseConfig()?.datepickerMonthNames || [];

  return (
    <div
      class={datepickerClass()}
      onClick={props.onClick}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
    >
      <div class="bg-lightest flex items-center rounded-t-lg p-1.5">
        <Button
          focusable={false}
          flat
          icon={prevIcon()}
          onClick={() => {
            handlePrev();
          }}
        />
        <Button
          focusable={false}
          flat
          class="flex-1 font-bold"
          onClick={
            mode() !== 'year'
              ? () => {
                  switch (mode()) {
                    case 'date': {
                      setMode('month');
                      break;
                    }
                    case 'month': {
                      setMode('year');
                      break;
                    }
                  }
                }
              : null
          }
        >
          <Switch>
            <Match when={mode() == 'date'}>
              {currentMonthName()}, {currentYear()}
            </Match>
            <Match when={mode() == 'month'}>{currentYear()}</Match>
            <Match when={mode() == 'year'}>
              {currentYears()
                .slice(0, 1)
                .concat(currentYears().slice(-1))
                .map((x) => x.year)
                .join('-')}
            </Match>
          </Switch>
        </Button>
        <Button
          focusable={false}
          flat
          icon={nextIcon()}
          onClick={() => {
            handleNext();
          }}
        />
      </div>
      <div class="bg-neutral-50 px-1 py-0">
        <Switch>
          <Match when={mode() == 'date'}>
            <div class="grid grid-cols-7">
              <For each={weekdayNames()}>
                {(weekday) => (
                  <Button
                    class="h-9 w-9 text-sm"
                    flat
                    transparent
                    label={weekday}
                    onClick={null}
                  />
                )}
              </For>
            </div>
          </Match>
          <Match when={mode() == 'month' || mode() == 'year'}>
            <Button
              class="h-9 w-full text-sm"
              flat
              transparent
              label={mode() == 'month' ? selectMonthText() : selectYearText()}
              onClick={null}
            />
          </Match>
        </Switch>
      </div>
      <div class="relative">
        <div
          class={`grid grid-cols-7 p-1 ${
            mode() == 'date' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <For each={currentDates()}>
            {(currentDate) => (
              <div class="aspect-square">
                <DateItem
                  date={currentDate.date}
                  isCurrentMonth={currentDate.isCurrentMonth}
                  isToday={currentDate.isToday}
                  isSelected={
                    selectedDate()
                      ? isSameDay(selectedDate()!, currentDate.date)
                      : false
                  }
                  isSelectedEnd={
                    selectedEndDate()
                      ? isSameDay(selectedEndDate()!, currentDate.date)
                      : false
                  }
                  isInRange={inRangeDates().includes(
                    formatDatetime(currentDate.date),
                  )}
                  isDisabled={currentDate.isDisabled}
                />
              </div>
            )}
          </For>
        </div>
        <Show when={mode() != 'date'}>
          <div class="absolute top-0 left-0 grid h-full w-full grid-cols-4 gap-1 p-1">
            <Switch>
              <Match when={mode() == 'month'}>
                <For each={currentMonths()}>
                  {(currentMonth, index) => {
                    let monthClass = 'p-3 text-sm flex-1 h-full leading-snug ';
                    const isSelected = currentMonth.isSelected;
                    if (currentMonth.isThisMonth)
                      monthClass +=
                        'bg-main-50 text-main hover:bg-main-100 hover:text-main-600 ';
                    if (isSelected) {
                      monthClass +=
                        'bg-main text-main-50 hover:bg-main-600 hover:text-main-100';
                    }
                    monthClass = mergeClass(monthClass);

                    return (
                      <Button
                        class={monthClass}
                        flat
                        color={isSelected ? 'main' : 'neutral'}
                        type={isSelected ? 'light' : 'flat'}
                        label={currentMonth.name}
                        onClick={() => handleSelectMonth(index())}
                      />
                    );
                  }}
                </For>
              </Match>
              <Match when={mode() == 'year'}>
                <For each={currentYears()}>
                  {(currentYear) => {
                    let yearClass = 'p-3 text-sm flex-1 h-full leading-snug ';
                    const isSelected = currentYear.isSelected;
                    if (currentYear.isThisYear)
                      yearClass +=
                        'bg-main-50 text-main hover:bg-main-100 hover:text-main-600 ';
                    if (isSelected) {
                      yearClass +=
                        'bg-main text-main-50 hover:bg-main-600 hover:text-main-100';
                    }
                    yearClass = mergeClass(yearClass);

                    return (
                      <Button
                        class={yearClass}
                        flat
                        color={isSelected ? 'main' : 'neutral'}
                        type={isSelected ? 'light' : 'flat'}
                        label={currentYear.year}
                        onClick={() => handleSelectYear(currentYear.year)}
                      />
                    );
                  }}
                </For>
              </Match>
            </Switch>
          </div>
        </Show>
      </div>
    </div>
  );
}
