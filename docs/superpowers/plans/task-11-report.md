# Task 11: Executive Dashboard — Dual-Score Display + Status Badges

**Status:** DONE

## Changes Made

### 1. ExecutiveDashboard.jsx — Status Badges

- Added `getStatusBadge(report)` function that maps report states to display labels and colors:
  - `REVIEWING` → UNDER_REVIEW (amber)
  - `PUBLISHED` + adminScore → VERIFIED (green)
  - `PUBLISHED` (no adminScore) → DRAFT (blue)
  - else → INTAKE (gray)
- Added `STATUS_BADGE_STYLES` map for Tailwind classes per color
- Updated `projectFromReport()` to include `rawStatus`, `adminScore`, `approvalNote`, and `adminOverrides` fields
- Updated status badge rendering in Track Status table and View Projects modal to use the new function
- Updated seed data (`INITIAL_MY_PROJECTS`) and simulation objects to include the new fields

### 2. ReportOverview.jsx — Dual-Score Display

- Added admin-verified score section (green box) that shows when `report.adminScore` is set
- Converted module scores section to a collapsible `<details>` element showing auto-generated pipeline score summary
- Added per-module admin override display (gold checkmark + override score) in the module grid

### Files Modified

- `src/components/ExecutiveDashboard.jsx` — status badge logic + data model
- `src/components/ReportOverview.jsx` — dual-score UI

## Test Summary

Lint could not be run due to shell permission issues in the environment; code reviewed manually for JSX correctness.

## Concerns

None — the seed data `rawStatus` values were chosen to exercise all badge states: PUBLISHED+adminScore (VERIFIED), PUBLISHED+null (DRAFT), REVIEWING (UNDER_REVIEW), RECEIVED (INTAKE).
