# CoastGuard Lite Design Guidelines

## Design Approach

**System Selected:** Material Design principles adapted for emergency services
**Rationale:** Life-safety application requiring maximum clarity, strong visual feedback, and clear state differentiation. Functionality and quick comprehension take absolute priority.

**Core Principles:**
- **Clarity First:** Every element must communicate its purpose instantly
- **State Visibility:** LIVE vs DRIFT modes must be unmistakable at a glance
- **Touch-Optimized:** Large tap targets (minimum 48px) for mobile/stress situations
- **Information Hierarchy:** Critical data (coordinates, status, time) always prominent

---

## Typography

**Font Stack:** System fonts for maximum performance and clarity
- Primary: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

**Hierarchy:**
- **Display (Status/Mode):** 2.5rem (40px), Bold, tracking-tight - LIVE MODE/DRIFT MODE headers
- **Heading:** 1.5rem (24px), Semibold - Section titles, panel headers
- **Body Large:** 1.125rem (18px), Medium - Coordinates, timestamps, primary data
- **Body:** 1rem (16px), Regular - Descriptive text, labels
- **Small:** 0.875rem (14px), Medium - Metadata, supplementary info

**Key Rules:**
- Status indicators use all-caps for emphasis
- Coordinates always use monospace variant for alignment: `font-variant-numeric: tabular-nums`
- Critical alerts use bold weight exclusively

---

## Layout System

**Spacing Scale:** Tailwind units of **2, 4, 6, 8, 12, 16**
- Tight spacing: `p-2, gap-2` - Within components
- Standard: `p-4, gap-4, m-4` - Component padding, card spacing
- Comfortable: `p-6, gap-6` - Section padding
- Generous: `p-8, m-8` - Major section separation
- Extra: `p-12, p-16` - Dashboard panel margins

**Grid Structure:**
- **Fisherman App:** Single column, full viewport utilization
- **Dashboard:** Sidebar (320px fixed) + Map (flex-1) layout on desktop, stack on mobile

---

## Component Library

### Fisherman Mobile App Components

**Primary Action Button:**
- Full-width or near-full-width (max-w-sm centered)
- Height: `h-14` (56px)
- Border radius: `rounded-xl`
- Typography: `text-lg font-semibold`
- States: Clear pressed/disabled states with opacity shifts

**Status Indicator:**
- Large badge component at top of screen
- Height: `h-16` with `px-6`
- Includes icon (signal indicator) + status text
- Border radius: `rounded-full`
- Uses status-specific styling (connected/disconnected)

**Map Preview Card:**
- Height: `h-64` for embedded map
- Border radius: `rounded-2xl`
- Shadow: `shadow-lg`

### Coast Guard Dashboard Components

**Map Container:**
- Full viewport height minus header: `h-[calc(100vh-4rem)]`
- No border radius - edge-to-edge for maximum screen real estate

**Control Panel Sidebar:**
- Fixed width: `w-80` (320px)
- Scrollable content: `overflow-y-auto`
- Sections separated by `gap-6`

**Data Display Cards:**
- Border radius: `rounded-lg`
- Padding: `p-4` to `p-6`
- Border: `border-2` with status-dependent treatment
- Shadow: `shadow-md`

**Coordinate Display:**
- Monospace-style presentation
- Large text: `text-xl`
- Label above value pattern
- Copy button adjacent

**Mode Badge (LIVE/DRIFT):**
- Position: Fixed top-right or within panel header
- Height: `h-10`
- Padding: `px-6`
- Border radius: `rounded-full`
- Typography: `text-sm font-bold uppercase tracking-wide`

**Control Buttons:**
- Height: `h-11` (44px)
- Full-width within panel
- Border radius: `rounded-lg`
- Icon + label combination

**Hour Slider:**
- Range input with labels
- Visible tick marks
- Large thumb for easy grabbing
- Current value displayed prominently above

**Toggle Controls (Heatmap/Paths):**
- Switch component pattern
- Height: `h-6`, width: `w-11`
- Label adjacent with `gap-3`

### Alert Components

**Alert Banner:**
- Full-width at top of dashboard
- Height: `h-12` minimum
- Border-left accent: `border-l-4`
- Icon + message + dismiss button
- Slide-in animation from top

**Toast Notification:**
- Fixed positioning: bottom-right
- Max-width: `max-w-sm`
- Border radius: `rounded-lg`
- Shadow: `shadow-xl`
- Auto-dismiss after 5 seconds

---

## Map Visualization

**Markers:**
- Live GPS: Pulsing marker, large size (24px icon)
- Last Known: Distinct icon, semi-transparent
- Drift Paths: Polylines with arrow decorators

**Heatmap:**
- Gradient intensity from low to high probability
- Adjustable opacity (50-80% range)
- Toggle on/off without removing data

**Legend:**
- Positioned bottom-left of map
- Compact: `p-3`
- Background with blur effect: `backdrop-blur-sm`
- Border radius: `rounded-lg`

---

## Responsive Behavior

**Fisherman App Breakpoints:**
- Base (mobile): Single column, full-width controls
- All sizes: Maintain same layout (mobile-first only)

**Dashboard Breakpoints:**
- Mobile/Tablet (`<1024px`): Stack sidebar above map, collapsible
- Desktop (`>=1024px`): Side-by-side, fixed sidebar

**Map Responsiveness:**
- Mobile: Full viewport, floating control buttons
- Desktop: Contained within layout grid

---

## Interaction Patterns

**GPS Start/Stop:**
- Single large button toggles between states
- Text changes: "Start Sharing My Location" ↔ "Stop Sharing"
- Visual feedback: Button transforms during active state

**Dashboard Refresh:**
- Manual refresh button with loading spinner
- Auto-refresh toggle with interval display

**Drift Trigger:**
- Automatic on signal loss
- Manual override button available
- Confirmation modal for manual trigger

**Data Updates:**
- Smooth transitions for coordinate changes
- Fade-in for new drift paths
- Pulse animation for heatmap updates

---

## Accessibility

- All interactive elements: minimum 44px touch target
- High contrast ratios: 4.5:1 minimum for all text
- Focus indicators: `ring-2 ring-offset-2` on all controls
- Screen reader labels for map controls and status indicators
- Keyboard navigation: Full support for dashboard controls

---

## Images

**Not Applicable** - This is a functional utility dashboard. All visual content is map-based (Leaflet rendered) and data-driven. No decorative or hero images needed. The interface is purely functional with maps, charts, and real-time data visualization.