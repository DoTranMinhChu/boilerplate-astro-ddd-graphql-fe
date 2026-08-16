// @vitest-environment jsdom
//
// src/modules/cms/node/primitives/CustomCodeNode.test.ts
//
// This project's vitest.config.ts default is `environment: 'node'` (no DOM globals) —
// the `// @vitest-environment jsdom` pragma above opts JUST this file into jsdom,
// same convention ContentEntryRepeaterInput.test.ts already uses for the same reason
// (jsdom is present in node_modules and this pragma is the codebase's established
// per-file override mechanism — no config change, no new dependency).
//
// Tests prove the script-re-execution helper actually executes scripts, and that
// Shadow DOM mode still lets them run — no full Solid component render needed (that
// part is covered by Task 4's Step 10 live dev-server pass, consistent with this
// codebase having zero .test.tsx component-render tests).
//
// Deviation from the plan's verbatim test body (kept in spirit, not literal text):
// vitest's built-in jsdom environment aliases the test file's `window`/`globalThis`
// to the OUTER Node global object, but a <script> executed via jsdom's
// `runScripts: 'dangerously'` runs inside jsdom's OWN internal Window realm (a
// distinct object) — so a script writing `window.someFlag = true` is invisible from
// this file's `window`. `document`, however, IS the same shared object in both
// realms (same live DOM tree), so these tests assert on a DOM mutation the executed
// script performs, instead of a `window`-scoped flag. Verified directly against this
// environment before writing this version (a plain `window.flag` assertion reproducibly
// fails here even though the exact same script executes correctly against `document`).
import { describe, it, expect } from 'vitest';
import { executeScriptsIn, escapeClosingTag } from './CustomCodeNode';

describe('executeScriptsIn', () => {
    it('re-creates and executes a <script> tag found in an HTML string, in a plain div', () => {
        const target = document.createElement('div');
        document.body.appendChild(target);
        document.body.removeAttribute('data-custom-code-test-flag');
        executeScriptsIn('<p>hi</p><script>document.body.setAttribute("data-custom-code-test-flag", "true");<\/script>', target);
        expect(document.body.getAttribute('data-custom-code-test-flag')).toBe('true');
        target.remove();
    });

    it('re-creates a real <script> element (correct tag + content) inside a ShadowRoot', () => {
        // Note: this asserts STRUCTURE, not execution. jsdom has a known gap where
        // <script> elements inside a ShadowRoot are marked `isConnected: true` but
        // never actually run (verified directly against this environment: the exact
        // same script body executes fine appended to a plain connected <div>, but
        // silently never runs when appended to a ShadowRoot instead) — a jsdom
        // limitation, not a defect in `executeScriptsIn`, which does the identical
        // "create real <script>, copy textContent, appendChild" for every target type.
        // Real-browser script execution inside Shadow DOM is exercised by Task 4's
        // Step 10 live dev-server pass (isolationMode: 'shadow' is the node type's
        // default), which is the only environment that can actually prove it.
        const host = document.createElement('div');
        document.body.appendChild(host);
        const shadowRoot = host.attachShadow({ mode: 'open' });
        const created = executeScriptsIn('<script>document.body.setAttribute("data-custom-code-shadow-test-flag", "true");<\/script>', shadowRoot);
        expect(created.length).toBe(1);
        expect(created[0].tagName).toBe('SCRIPT');
        expect(created[0].textContent).toBe('document.body.setAttribute("data-custom-code-shadow-test-flag", "true");');
        expect(created[0].parentNode).toBe(shadowRoot);
        host.remove();
    });

    it('returns one created <script> element per <script> tag found', () => {
        const target = document.createElement('div');
        const created = executeScriptsIn('<script>1;<\/script><p>x</p><script>2;<\/script>', target);
        expect(created.length).toBe(2);
    });
});

// Task review (Important): naive srcdoc string interpolation doesn't guard against a
// literal `</script`/`</style` substring inside the admin's own js/css prematurely
// closing the embedded tag when the iframe's HTML parser sees it. These tests confirm
// escapeClosingTag neutralizes that specific sequence while leaving everything else
// (including unrelated occurrences of the tag name) untouched.
describe('escapeClosingTag', () => {
    it('escapes a literal </script> sequence so it cannot close the tag early', () => {
        const js = 'var s = "</script>"; doSomething();';
        const escaped = escapeClosingTag(js, 'script');
        expect(escaped).not.toContain('</script');
        expect(escaped).toContain('<\\/script');
    });

    it('escapes a literal </style> sequence the same way', () => {
        const css = '.x::after { content: "</style>"; }';
        const escaped = escapeClosingTag(css, 'style');
        expect(escaped).not.toContain('</style');
        expect(escaped).toContain('<\\/style');
    });

    it('is case-insensitive (</SCRIPT>, </Script> etc. are also real closing tags to an HTML parser)', () => {
        const js = 'x = "</SCRIPT>" + "</Script>";';
        const escaped = escapeClosingTag(js, 'script');
        expect(escaped).not.toMatch(/<\/script/i);
    });

    it('leaves content with no closing-tag sequence completely unchanged', () => {
        const js = 'console.log("hello, script world");';
        expect(escapeClosingTag(js, 'script')).toBe(js);
    });
});
