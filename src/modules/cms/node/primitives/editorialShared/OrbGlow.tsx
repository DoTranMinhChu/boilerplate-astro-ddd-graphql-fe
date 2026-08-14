import './editorialEffects.css';

export function OrbGlow(props: { color: 'magenta' | 'cyan' | 'gold' }) {
    return <div class={`ed-orb ed-orb-${props.color}`} aria-hidden="true" />;
}
