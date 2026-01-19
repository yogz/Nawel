/**
 * @deprecated This file is kept for backwards compatibility.
 * The EventPlannerHeader has been refactored into smaller components.
 *
 * New location: ./event-header/
 *
 * Component Structure:
 * - EventPlannerHeader (main container) - ./event-header/event-planner-header.tsx
 * - EventHeaderNav (back + menu buttons) - ./event-header/event-header-nav.tsx
 * - EventTitle (editable title) - ./event-header/event-title.tsx
 * - EventMetaPills (date, time, location) - ./event-header/event-meta-pills.tsx
 * - EventHeaderActions (calendar, share) - ./event-header/event-header-actions.tsx
 *
 * Import from './event-header' for new code:
 * import { EventPlannerHeader } from './event-header';
 */

export { EventPlannerHeader } from "./event-header";
