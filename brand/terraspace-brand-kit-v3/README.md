# TerraSpace responsive logo kit

This package converts the supplied horizontal mark into a dashboard-ready responsive logo system.

**Revision 3:** the micro mark now uses the same triangular cardinal pointers and segmented circular orbit as the compact symbol on both dark and light backgrounds.

## Recommended dashboard usage

| Surface | Asset | Practical size |
|---|---|---:|
| Desktop sidebar | `terraspace-compact-dark.svg` | 160–200 px wide |
| Desktop top bar | `terraspace-compact-dark.svg` | 170–220 px wide |
| Collapsed sidebar | `terraspace-symbol-compact-dark.svg` | 32–44 px |
| Mobile header | `terraspace-micro-dark.svg` | 28–36 px |
| Login / splash screen | `terraspace-stacked-dark.svg` | 180–320 px wide |
| Favicon | files in `/favicon` | 16–48 px |

Use files ending in `-dark` on dark backgrounds; these contain light lines and lettering. Use files ending in `-light` on white or pale backgrounds.

## Logo hierarchy

1. **Horizontal:** detailed presentation lockup. Use only when the available width is at least 360 px.
2. **Compact:** default dashboard navigation lockup. It has stronger strokes, shorter compass points, and tighter typography.
3. **Stacked:** login, empty state, splash screen, and square-format layouts.
4. **Symbol compact:** collapsed navigation and small tiles.
5. **Micro:** favicon and very small interface placement. Do not replace it with the detailed symbol.

## Clear space

Use the center gold diamond as the measuring unit `X`.

- Horizontal and compact: minimum clear space `0.5X`.
- Symbol and micro mark: minimum clear space `0.75X`.
- Do not place the mark directly against a sidebar edge; retain at least 12 px in UI layouts.

## Brand colors

- TerraSpace Gold: `#DFA750`
- Ink: `#111318`
- Canvas: `#050608`
- Paper: `#F7F7F5`
- Muted interface text: `#A7ABB4`

Import `css/terraspace-brand.css` for ready-made CSS custom properties and sizing classes.

## React

Copy `react/TerraSpaceLogo.tsx` and `react/SidebarBrand.tsx` into the project. Place the SVG assets in `public/brand`, or change the `assetBase` property.

```tsx
<TerraSpaceLogo variant="compact" theme="dark" className="ts-logo ts-logo--sidebar" />
```

## Accessibility

Keep the `alt` text as `TerraSpace` when the logo communicates the brand. Use an empty `alt` only when adjacent visible text already provides the same information. The gold accent should not be used as small body text on white because it may not provide sufficient text contrast.

## Production note

The original source was a raster image. This kit is a clean vector reconstruction and responsive interpretation, not an exact extraction of the original master artwork. Keep an archived copy of the original source and replace these SVGs later if an approved master vector becomes available.
