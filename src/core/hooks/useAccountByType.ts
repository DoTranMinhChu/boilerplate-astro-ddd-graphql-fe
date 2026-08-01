// src/shared/hooks/useAccountByType.ts

import { createMemo, createSignal, onMount } from 'solid-js';
import { useAuth } from '@/shared/contexts/auth/AuthContext';
import { EAccountType, AuthAccountDTO } from '@/shared/types/auth.type';

export function useAccountByType(type: EAccountType) {
    const auth = useAuth();

    // Loading state riêng cho từng layout
    const [isLoading, setIsLoading] = createSignal(true);

    const account = createMemo<AuthAccountDTO | null>(
        () => auth.getAccountByType(type),
    );

    onMount(async () => {
        // Apply token ngay lập tức
        auth.applyTokenForType(type);

        // Restore account — chỉ fetch type này, không ảnh hưởng layout khác
        await auth.restoreAccount(type);

        setIsLoading(false);
    });

    const isReady = createMemo(() => !isLoading() && account() !== null);

    return {
        account,
        isLoading,
        isReady,
        refetch: () => auth.refetchAuthAccount(),
    };
}