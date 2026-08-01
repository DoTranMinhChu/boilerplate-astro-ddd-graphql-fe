// src/shared/contexts/feature/FeatureContext.tsx

import { createContext, useContext, createSignal, JSX, Accessor } from 'solid-js';
import { EFeature } from '@/shared/generated/typed-graphql';

interface IFeatureContext {
    features: Accessor<EFeature[]>;
    isLoaded: Accessor<boolean>;
    setFeatures: (features: EFeature[]) => void;
    hasFeature: (feature: EFeature) => boolean;
    hasAnyFeature: (...features: EFeature[]) => boolean;
}

const FALLBACK: IFeatureContext = {
    features: () => [],
    isLoaded: () => true,
    setFeatures: () => {},
    hasFeature: () => true,       // Fallback = full access (admin/dev)
    hasAnyFeature: () => true,
};

const FeatureContext = createContext<IFeatureContext>();
export const useFeature = () => useContext(FeatureContext) ?? FALLBACK;

export function FeatureProvider(props: { children: JSX.Element }) {
    const [features, setFeaturesSignal] = createSignal<EFeature[]>([]);
    const [isLoaded, setIsLoaded] = createSignal(false);

    const setFeatures = (f: EFeature[]) => {
        setFeaturesSignal(f);
        setIsLoaded(true);
    };

    const hasFeature = (f: EFeature) => features().includes(f);
    const hasAnyFeature = (...f: EFeature[]) => f.some(hasFeature);

    return (
        <FeatureContext.Provider value={{ features, isLoaded, setFeatures, hasFeature, hasAnyFeature }}>
            {props.children}
        </FeatureContext.Provider>
    );
}