# Plan: Fix Mobile Layout Overlap

The user reported layout issues on mobile:
1. "Participar Agora" button overlapping with the countdown timer in the hero section.
2. Game cards (Roulette, Scratch Card) overlapping with other elements.

## Proposed Changes

### 1. Hero Layout (HeroModel1)
- Adjust mobile spacing between the countdown timer, title, and "Participar Agora" button.
- Ensure the button has proper margin-top on small screens.
- Refine the `scale` and positioning of the `CountdownTimer` for mobile views.

### 2. Game Cards Layout (Index Page)
- Adjust the negative margin `-mt-6 md:-mt-12` on the games section which is likely causing the overlap with the hero content on small screens.
- Improve the grid spacing and padding for the game cards on mobile.

### 3. Countdown Timer Component
- Ensure the `CountdownTimer` component itself handles scaling gracefully without breaking layout context.

## Technical Details
- **Files to modify:**
    - `src/components/hero/HeroModel1.tsx`: Adjust spacing and layout for mobile.
    - `src/pages/Index.tsx`: Adjust the games section positioning (`-mt-6` to `mt-4` or similar for mobile).
- **CSS adjustments:** Use Tailwind responsive classes (`sm:`, `md:`, `lg:`) to ensure specific mobile fixes don't affect desktop.
