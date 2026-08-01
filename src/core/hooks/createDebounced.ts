// src/core/hooks/createDebounced.ts
import { onCleanup } from 'solid-js';

export function createDebounced<T extends (...args: any[]) => any>(
    fn: T,
    delay = 400,
): [debounced: T, cancel: () => void] {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cancel = () => {
        if (timer) { clearTimeout(timer); timer = null; }
    };

    const debounced = ((...args: Parameters<T>) => {
        cancel();
        timer = setTimeout(() => fn(...args), delay);
    }) as T;

    onCleanup(cancel);          // tự dọn khi component unmount
    return [debounced, cancel];
}