---
name: Kinetic Horizon
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf1'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fa'
  on-surface: '#111c2c'
  on-surface-variant: '#43474e'
  inverse-surface: '#263142'
  inverse-on-surface: '#ebf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#875200'
  on-secondary: '#ffffff'
  secondary-container: '#ffb55c'
  on-secondary-container: '#744600'
  tertiary: '#1b2127'
  on-tertiary: '#ffffff'
  tertiary-container: '#30363c'
  on-tertiary-container: '#989fa6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#ffddba'
  secondary-fixed-dim: '#ffb866'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#673d00'
  tertiary-fixed: '#dde3eb'
  tertiary-fixed-dim: '#c1c7cf'
  on-tertiary-fixed: '#161c22'
  on-tertiary-fixed-variant: '#41474e'
  background: '#f9f9ff'
  on-background: '#111c2c'
  surface-variant: '#d8e3fa'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style
The design system is anchored in the concept of "Confident Exploration." It targets modern families who value both the excitement of travel and the security of a well-organized plan. The brand personality is dependable yet vibrant, balancing the authoritative stability of a heritage travel brand with the agility of a modern tech startup.

The visual style is **Modern Minimalism** with a focus on high-clarity information density. It prioritizes generous whitespace to reduce cognitive load—crucial for parents managing logistics. The emotional response is one of calm reliability, punctuated by "energetic sparks" that evoke the joy of discovery. Visual elements are clean and uncluttered, ensuring that family photos and destination imagery remain the focal point.

## Colors
The palette is designed to establish trust through the **Deep Navy** primary, while the **Energetic Orange** secondary acts as a functional beacon for calls-to-action and key milestones. 

- **Primary (Deep Navy):** Used for headers, primary buttons, and core branding. It provides the "anchor" for the UI.
- **Secondary (Energetic Orange):** Reserved for interactive elements, highlights, and status indicators. It should be used sparingly to maintain its impact.
- **Surface & Backgrounds:** The system uses a tiered "Paper" approach. The base background is white (#FFFFFF), with secondary containers using a very soft Blue-Gray tint (#F7FAFC) to create subtle grouping without heavy borders.
- **Semantic Colors:** Success (Teal), Warning (Amber), and Error (Crimson) follow standard accessibility contrasts but are softened to match the friendly aesthetic.

## Typography
This design system utilizes a dual-font strategy to balance character with legibility. 

**Montserrat** is used for headlines to provide a bold, geometric, and modern feel. It communicates energy and confidence. **Inter** is the workhorse for all body copy and UI labels, chosen for its exceptional readability and neutral, professional tone.

Maintain a strict vertical rhythm by sticking to the defined line heights. For long-form reading (like travel guides), use `body-lg`. For transactional interfaces and forms, use `body-md`. All "Display" and "Headline" levels should use tighter letter spacing to maintain a cohesive visual block.

## Layout & Spacing
The layout follows a **Fluid Grid** model with 12 columns for desktop and 4 columns for mobile. 

- **Rhythm:** An 8px base unit governs all dimensions. Elements should always align to increments of 8px.
- **Containers:** Content is housed in "Travel Cards" or "Section Blocks" with generous internal padding (`md` or 24px) to ensure a spacious feel.
- **Negative Space:** Use the `xl` (80px) spacing to separate major content sections on desktop to reinforce the minimalist philosophy.
- **Mobile Reflow:** On mobile devices, side-by-side cards should stack vertically, and horizontal scrolling "carousels" should be used for destination previews to preserve vertical real estate.

## Elevation & Depth
Depth is created through **Tonal Layers** rather than heavy shadows. This keeps the interface feeling light and "airy."

- **Level 0 (Base):** Pure white or the light gray background.
- **Level 1 (Cards/Inputs):** A 1px border of `tertiary_color_hex` (#E2E8F0).
- **Level 2 (Hover/Active):** A soft, ambient shadow with 12% opacity of the Primary Deep Navy, with a 16px blur. No harsh edges.
- **Modals/Overlays:** Use a Backdrop Blur (12px) to dim the background, keeping the focus entirely on the family-critical information without losing context of the previous screen.

## Shapes
The shape language is "Friendly-Geometric." Rounded corners are applied to almost all UI elements to soften the professional Navy/Orange palette and make the app feel accessible to families.

- **Standard Elements:** 8px (`0.5rem`) radius for buttons, input fields, and small cards.
- **Feature Containers:** Large containers and hero image sections use 16px (`1rem`) or 24px (`1.5rem`) to create a distinct, modern "app-like" look.
- **Icons:** Use a consistent 2px stroke width with rounded caps and joins. Avoid sharp 90-degree angles in iconography.

## Components
- **Buttons:** Primary buttons are solid Deep Navy with white text. Secondary actions use the Energetic Orange as an outline (Ghost button) or text link. High-priority CTAs (like "Book Now") use solid Energetic Orange.
- **Chips:** Used for travel tags (e.g., "Kid-Friendly," "Pet-Friendly"). Use a light Primary tint background with Deep Navy text.
- **Cards:** Travel cards must include a high-quality image with a 16px top-corner radius. Content inside should have 20px padding.
- **Inputs:** Clean, outlined fields with a 1px border. On focus, the border thickens to 2px and changes to Deep Navy. Labels always sit above the input, never as placeholder text only.
- **Navigation:** A clean bottom tab bar for mobile with rounded icons. On desktop, a persistent top-navigation bar with a "Family Profile" switcher clearly visible on the right.
- **Progress Indicators:** Use the Energetic Orange for trip progress bars or loading states to maintain a sense of "active movement."