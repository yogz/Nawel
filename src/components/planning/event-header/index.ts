/**
 * Event Header Components
 * =======================
 * This module exports all event header related components.
 *
 * Component Hierarchy:
 * - EventPlannerHeader (main sticky header container)
 *   ├── EventHeaderNav (back button, menu button)
 *   ├── EventTitle (editable event name)
 *   ├── EventMetaPills (date, time, location pills)
 *   └── EventHeaderActions (calendar, share buttons)
 *
 * Styling Notes:
 * - Header uses sticky positioning with z-100 (see globals.css hierarchy)
 * - Safe-area padding is applied for notch/status bar
 * - Backdrop blur and border appear on scroll (isScrolled state)
 * - All colors transition between white (non-scrolled) and gray (scrolled)
 */

export { EventPlannerHeader } from "./event-planner-header";
export { EventHeaderNav } from "./event-header-nav";
export { EventTitle } from "./event-title";
export { EventMetaPills } from "./event-meta-pills";
export { EventHeaderActions } from "./event-header-actions";
