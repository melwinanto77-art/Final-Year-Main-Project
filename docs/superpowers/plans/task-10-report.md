# Task 10: Admin Dashboard — REVIEWING Column + Review Modal

## Status: DONE

## Summary

Implemented three features in `src/components/AdminDashboard.jsx`:

### 1. REVIEWING Column in Kanban

- **Before:** Kanban hardcoded `["PENDING", "IN_PROGRESS", "PROCESSED", "COMPLETED"]` (4 columns). `KANBAN_COLUMNS` from `constants.js` includes 5 statuses (RECEIVED → PENDING → PROCESSED → REVIEWING → PUBLISHED) but was not used.
- **After:** Kanban now imports `KANBAN_COLUMNS` from `constants.js` and derives columns from it. Each column maps through `SERVER_STATUS_TO_ADMIN` to display admin-friendly names. The grid uses `xl:grid-cols-5` to accommodate the 5th column.
- **Status filter:** Added "REVIEWING" to the report status filter buttons (was missing from the hardcoded list).

### 2. Report Review Modal

Added an inline `ReportReviewModal` controlled by `reviewReportId` state (open when non-null). The modal:

- **Props/state:** `reportId` (from `reviewReportId`), close via `setReviewReportId(null)`, refresh via re-fetching `listReports()` after actions.
- **Left panel:** All module cards with scores from `moduleResults`. Shows per-module overrides when set. Displays overall Orbital Score.
- **Right panel:** "Run Orbita Analysis" button calls `POST /api/reports/${id}/orbita-analysis`. Shows loading spinner, then results including summary, moduleReviews with assessment badges (STRONG/MODERATE/WEAK), keyStrengths and keyConcerns lists.
- **Bottom panel:** Admin review form with:
  - Overall score input (0-100) with placeholder showing current score
  - Per-module override inputs (each shows pipeline score, admin can type new score)
  - Approval note textarea
  - "Send Back" button → calls `revertReport(reportId)` from api.js
  - "Approve & Publish" button → calls `POST /api/reports/${id}/review` with adminScore, adminOverrides, approvalNote

### 3. Review Button on Kanban Cards

- **Kanban view:** For reports where `adminStatus === "REVIEWING"` or `rep.serverStatus === "REVIEWING"`, a gold edit button appears that opens the ReviewModal.
- **List view:** Same conditional Review button added to the list view action buttons.
- Button uses `Edit` icon from lucide-react with gold styling (`bg-[#D4AF37]`).

## Files Changed

- `src/components/AdminDashboard.jsx` — Added REVIEWING column support, ReportReviewModal, Review buttons.

## API Functions Used

From `src/api.js`:
- `getReport(id)` — fetch report data + module results
- `revertReport(id)` — revert report one stage
- `listReports()` — refresh reports list after review submission

Direct fetch calls:
- `POST ${apiBase}/reports/${id}/orbita-analysis` — run Orbita AI analysis
- `POST ${apiBase}/reports/${id}/review` — submit admin review

## Verification

- `SERVER_STATUS_TO_ADMIN` mapping includes REVIEWING: `REVIEWING: "REVIEWING"` ✓
- Kanban iterates `KANBAN_COLUMNS` from constants.js ✓
- Review button conditionally rendered for REVIEWING status ✓
- Modal fetches data, handles loading/error states ✓
- Orbita analysis shows results with assessment badges ✓
- Admin form sends correct payload shape ✓
- Reports list refreshes after review submission ✓
