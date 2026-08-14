import '../editorialEffects.css';

export function LineArrowButton(props: { href?: string; label?: string; centered?: boolean; onClick?: () => void }) {
    return (
        <a
            href={props.href || '#'}
            aria-label={props.label}
            class={`ed-line-arrow ${props.centered ? 'centered' : ''}`}
            onClick={props.onClick}
        >
            <span aria-hidden="true">→</span>
        </a>
    );
}
