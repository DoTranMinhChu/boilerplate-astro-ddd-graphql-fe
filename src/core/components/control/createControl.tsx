import { generateId } from '@core/helpers/util';
import { createEffect, createSignal, onMount, untrack } from 'solid-js';
import { useField } from '../form/FieldContext';

export type ControlType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'object_array'
  | 'id'
  | 'mixed'
  | 'date';
export function createControl<T>(
  type: ControlType,
  props: Pick<
    FormControlProps<T>,
    | 'id'
    | 'value'
    | 'onChange'
    | 'defaultValue'
    | 'readOnly'
    | 'disabled'
    | 'error'
    | 'fieldless'
    | 'nullable'
  >,
) {
  const [hasInited, setHasInited] = createSignal<boolean>(false);
  const controlId = generateId();
  const field = props.fieldless ? undefined : useField();
  const hasField = () => !!field && !!field.name() && !props.fieldless;
  const isControlled = () => props.value !== undefined;
  const readOnly = () =>
    props.disabled ||
    props.readOnly ||
    field?.disabled() ||
    field?.readOnly() ||
    undefined;
  const error = () => props.error || (hasField() ? field?.error() : undefined);
  const id = () => props.id || field?.id || controlId;
  const name = () => (hasField() ? field?.name() : undefined);

  const defaultValue = () => {
    if (props.defaultValue !== undefined) {
      return props.defaultValue;
    } else {
      return getEmptyValue();
    }
  };

  const getEmptyValue = () => {
    if (props.nullable) return null;
    switch (type) {
      case 'text':
        return '';
      case 'number':
        return 0;
      case 'date':
        return null;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'id':
        return null;
      case 'mixed':
        return null;
      case 'object':
        return null;
      case 'object_array':
        return [];
    }
  };

  const [value, setValue] = createSignal<T>(
    (props.value || defaultValue()) as any,
  );

  const onChange = (val: T) => {
    setValue(() => val);
    props.onChange?.(val);
    if (hasField()) {
      field?.setValue(val);
    }
  };

  // Đồng bộ signal hiển thị nội bộ theo props.value (controlled) — chỉ setValue,
  // KHÔNG gọi onChange(val) ở đây. onChange(val) còn gọi ngược props.onChange?.(val),
  // và ở phần lớn call site, props.onChange trỏ tới 1 setter kiểu
  // `setForm(prev => ({...prev, [key]: val}))` — luôn tạo object mới dù value không đổi,
  // khiến props.value (đọc lại từ form mới) bị coi là "đổi" → effect này tự kích hoạt lại
  // chính nó vô hạn (value luôn kẹt ở giá trị ban đầu vì mỗi vòng lặp đều dùng val cũ đã
  // untrack, không bao giờ thấy được giá trị thật gán vào sau đó, ví dụ khi chọn lại 1
  // bản ghi khác trong form "Cập nhật cấu hình" — field luôn hiện trống).
  createEffect(() => {
    const val = props.value;
    untrack(() => {
      if (val !== undefined) {
        setValue(() => val);
      }
    });
  });

  onMount(() => {
    if (hasField()) {
      field?.registerControl({
        type,
        isControlled: isControlled(),
        nullable: props.nullable || false,
        defaultValue: defaultValue(),
        onValueSet: (val: any) => {
          if (val !== value()) {
            onChange(val);
          }
          setHasInited(true);
        },
      });
    } else {
      setHasInited(true);
      if (value() === undefined) {
        setValue(
          props.value !== undefined ? props.value : (defaultValue() as any),
        );
      }
    }
  });

  return {
    id,
    name,
    readOnly,
    value,
    onChange,
    error,
    defaultValue,
    getEmptyValue,
    hasInited,
  };
}
