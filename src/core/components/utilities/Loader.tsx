export const Loader = (_props: BaseProps) => (
  <svg x="0px" y="0px" width="1em" height="1em" viewBox="0 0 24 24">
    <circle cx="4" cy="11" r="2" fill="currentColor">
      <animate
        attributeName="opacity"
        attributeType="XML"
        values="1; .2; 1"
        begin="0s"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="12" cy="11" r="2" fill="currentColor">
      <animate
        attributeName="opacity"
        attributeType="XML"
        values="1; .2; 1"
        begin="0.2s"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
    <circle cx="20" cy="11" r="2" fill="currentColor">
      <animate
        attributeName="opacity"
        attributeType="XML"
        values="1; .2; 1"
        begin="0.4s"
        dur="1s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);
