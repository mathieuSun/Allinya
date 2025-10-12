# Allinya Design Guidelines

## Design Approach
**Reference-Based Approach** drawing from wellness platforms (Calm, Headspace) for calming aesthetics, Airbnb for marketplace trust patterns, and modern video conferencing interfaces for session UX. The design prioritizes emotional connection, trust-building, and serene user experience appropriate for healing sessions.

---

## Core Design Principles
1. **Healing First**: Create a calming, trustworthy environment that puts users at ease
2. **Clarity in Flow**: Make the two-phase session system (Waiting → Live) crystal clear
3. **Trust Through Transparency**: Practitioner profiles should feel authentic and comprehensive
4. **Mindful Minimalism**: Remove distractions, focus attention where it matters

---

## Color Palette

### Light Mode
- **Primary**: 260 30% 25% (Deep calming purple - trust and spirituality)
- **Primary Hover**: 260 35% 20%
- **Secondary**: 200 25% 45% (Soft teal - healing and balance)
- **Accent**: 340 60% 55% (Warm coral - energy and action, use sparingly for CTAs)
- **Background**: 240 5% 98% (Warm off-white)
- **Surface**: 0 0% 100% (Pure white cards)
- **Text Primary**: 240 10% 15%
- **Text Secondary**: 240 5% 45%
- **Border**: 240 8% 90%

### Dark Mode
- **Primary**: 260 35% 70% (Lighter purple for dark backgrounds)
- **Primary Hover**: 260 40% 75%
- **Secondary**: 200 30% 60% (Brighter teal)
- **Accent**: 340 55% 65% (Softer coral)
- **Background**: 240 8% 8% (Rich dark background)
- **Surface**: 240 6% 12% (Elevated dark surface)
- **Text Primary**: 240 5% 95%
- **Text Secondary**: 240 5% 65%
- **Border**: 240 5% 20%

---

## Typography

### Font Families
- **Primary (Headings)**: "Inter" - Clean, modern, professional
- **Secondary (Body)**: "Inter" - Consistency across the app
- **Accent (Optional specialties/tags)**: "DM Sans" - Friendly, approachable

### Type Scale
- **Hero (H1)**: text-5xl md:text-6xl font-bold tracking-tight
- **Page Title (H2)**: text-4xl font-semibold
- **Section Header (H3)**: text-2xl md:text-3xl font-semibold
- **Card Title (H4)**: text-xl font-semibold
- **Body Large**: text-lg leading-relaxed
- **Body**: text-base leading-relaxed
- **Caption**: text-sm text-secondary
- **Label**: text-sm font-medium

---

## Layout System

### Spacing Units
Use Tailwind units: **2, 3, 4, 6, 8, 12, 16, 20, 24** for consistent rhythm
- Tight spacing: p-2, p-3, p-4
- Standard spacing: p-6, p-8, gap-6
- Section spacing: py-12, py-16, py-20, py-24
- Large spacing: py-32 (hero sections)

### Grid & Containers
- **Max Container Width**: max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- **Content Width**: max-w-4xl (for text-heavy content)
- **Practitioner Grid**: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

---

## Component Library

### Navigation
- Fixed top navigation with blur backdrop (backdrop-blur-lg bg-background/80)
- Logo left, auth/profile right
- Practitioner: Online toggle prominently displayed
- Clean divider: border-b border-border

### Practitioner Cards (Explore Grid)
- Aspect ratio 3:4 card with large avatar/hero image
- Hover: subtle scale (hover:scale-105 transition-transform)
- Overlay gradient on image for text readability
- Elements: Avatar, name (text-lg font-semibold), specialties (max 4 chips), rating stars
- CTA: "Start Session" button prominent at bottom

### Practitioner Profile Page (Public)
- **Hero Section**: Full-width hero image (h-80 md:h-96) with overlay
- Avatar overlapping hero (absolute positioning, -bottom-12)
- **Content Section**: max-w-4xl centered
  - Name (text-4xl font-bold)
  - Specialties chips (badge style with primary/50 background)
  - Full bio (text-lg leading-relaxed, no truncation)
- **Gallery Grid**: 2-column grid with 3 images + video placeholder
- Sticky CTA bar: "Start Session" floating at bottom with backdrop blur

### Session Duration Selector
- Modal/Dialog with 4 large cards: 5min, 15min, 30min, 60min
- Each card shows duration prominently with pricing placeholder
- Selected state: border-2 border-primary

### Waiting Room
- **Layout**: Split view or centered single focus
- **Timer**: Massive countdown (text-6xl md:text-8xl font-bold) with primary color
- **Ready Indicators**: Two large status badges showing both participants
  - "Waiting for [name]..." or "✓ Ready"
- **I'm Ready Button**: Extra large CTA (px-12 py-6 text-xl)
- Optional chat: minimal sidebar, secondary focus

### Live Video Session
- **Video Layout**: Grid or spotlight based on speakers
- **Timer Bar**: Fixed top, countdown (text-2xl font-semibold) with progress bar
- **Controls**: Bottom bar with mute/camera/leave buttons (rounded-full, backdrop-blur)
- Minimal UI during session, controls auto-hide after 3s

### End Sheet
- Centered card (max-w-md)
- Thank you message (text-2xl font-semibold)
- Rating: 5 large stars (interactive)
- Comment textarea (optional)
- "Complete" button

### Forms & Inputs
- Consistent dark mode support with bg-surface, border-border
- Labels: text-sm font-medium mb-2
- Input fields: rounded-lg px-4 py-3, focus:ring-2 ring-primary
- File upload: Drag-and-drop zone with dashed border

### Specialty Chips
- Rounded-full px-4 py-1.5
- Background: primary/10 dark:primary/20
- Text: text-sm font-medium text-primary
- Max 4 per practitioner

---

## Session Flow Visual States

### Phase Indicators
- **Waiting**: Amber/yellow accent color, pulsing animation
- **Live**: Green/teal accent, solid indicator
- **Ended**: Gray/muted state

### Rejoin Banner
- Sticky top banner when user can rejoin
- Prominent "Rejoin Session" CTA with remaining time
- Background: accent color with 90% opacity

---

## Images

### Hero Image (Marketing/Landing)
**Main Hero**: Full-width calming scene - serene meditation space, soft natural lighting, plants, or abstract peaceful gradient. Height: h-screen md:h-[600px]

### Practitioner Profiles
- **Hero Image**: Wide landscape (16:9) showing practitioner's space or abstract calming scene
- **Gallery Images**: Square or portrait format showing authentic practice environment
- **Avatar**: Circular, warm and approachable professional photo

### Placeholder Images
- Use soft gradients as fallbacks
- Empty states: Illustrated icons with calming colors

---

## Animations
**Minimal and purposeful:**
- Page transitions: Gentle fade (duration-200)
- Card hover: scale-105 (duration-300)
- Timer countdown: No animation, just number updates
- Ready state change: Fade in checkmark (duration-150)
- **Avoid**: Excessive motion, spinning loaders, bouncing elements

---

## Responsive Behavior
- Mobile: Stack all columns, larger touch targets (min-h-12)
- Tablet: 2-column grids, preserve key spacing
- Desktop: Full 3-column grids, max-w-7xl containers
- Video sessions: Full-screen on mobile, contained on desktop