# Web Accessibility Checklist

Use this checklist before shipping public website changes.

## Navigation

- Skip link is present and reaches `#main`.
- Header links are keyboard reachable.
- Mobile menu button has `aria-expanded` and an accessible label.
- Focus states are visible on links, buttons, and tab-like controls.
- Sticky header does not cover focused content in normal flows.

## Content Structure

- Every page has one clear `h1`.
- Section headings follow a logical order.
- CTA labels describe the destination or action.
- Decorative visuals are marked with `aria-hidden` or paired with useful labels.
- Status visuals also have text labels.

## Motion

- `prefers-reduced-motion: reduce` keeps pages readable and stable.
- Autoplay animation is decorative or backed by static text.
- No animation is required to understand route, policy, simulation, or execution state.
- Motion does not create layout shift.

## Color And Contrast

- Body copy uses zinc tones with sufficient contrast on graphite backgrounds.
- Keeta green is used for positive status, not long paragraphs.
- Amber and rose status text is paired with labels, not color alone.
- Focus rings use high-contrast Keeta green.

## Forms And Controls

- Buttons use semantic `button` elements.
- Tab-like controls expose `role="tab"` and `aria-selected` where applicable.
- Disabled or unavailable states are explained in text.

## Test Coverage

Run:

```bash
pnpm test:web:e2e
```

The current e2e suite checks:

- Homepage render.
- Hero CTAs.
- Primary navigation.
- `/demo`, `/security`, and `/docs`.
- Console-error guards on core routes.
- Reduced-motion rendering for homepage and demo.

Manual assistive technology testing is still recommended before a public launch.
