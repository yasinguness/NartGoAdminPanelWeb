# Admin Panel Refactoring Implementation Plan

This document outlines the step-by-step plan to standardize functionality and design across the NartGo Admin Panel.

## ✅ Phase 1: Foundation (Completed)

- [x] Defined theme tokens (palette, spacing, typography) in `src/theme/`
- [x] Created base layout components (`PageContainer`, `PageHeader`, `PageSection`)
- [x] Standardized Breadcrumbs component and moved to `src/components/Page/`

## ✅ Phase 2: Shared Components (Completed)

- [x] **Data Display**: Created `DataTable`, `StatCard`, `StatusChip`, `EmptyState`
- [x] **Actions**: Created `ActionButton`, `ActionMenu`, moved `ConfirmDialog` to `src/components/Actions/`
- [x] **Forms**: Created `FormField`, `FormGrid`, `FormSection` and standardized inputs in `src/components/Form/fields/`
- [x] **Filters**: Created `FilterBar`, `ActiveFilters`, `SearchInput`

## 🚀 Phase 3: Page Migration (In Progress)

Goal: Migrate existing pages to use the new standardized components.

### Priority 1: Simple List/Dashboard Pages

These pages are low complexity and will serve as a testing ground for the new components.

- [ ] **Dashboard** (`src/pages/Dashboard/Dashboard.tsx`)

  - Replace layout with `PageContainer`
  - Use `PageHeader`
  - Standardize Stat cards using `StatCard`

- [ ] **Devices** (`src/pages/Devices.tsx` or similar)

  - Implement `PageHeader` with breadcrumbs
  - Replace table with `DataTable`
  - Add `FilterBar` for search

- [ ] **Business Categories**

  - Standardize layout and table
  - Update form dialogs to use `FormField`

- [ ] **Event Categories**
  - Same as Business Categories

### Priority 2: Medium Complexity Pages

Pages with list + detail views.

- [ ] **Federations**
- [ ] **Associations**
- [ ] **Events**
- [ ] **Businesses**

### Priority 3: High Complexity Pages

Pages with complex forms, tabs, or custom logic.

- [ ] **Users** (Partially Refactored)

  - `UserDetails` is mostly done
  - `Users` list page needs full `DataTable` integration if not already perfect

- [ ] **Notifications**

  - Refactor list view
  - Ensure dialogs use `FormSection` completely

- [ ] **Ticket Creation**
  - Complex wizard form refactoring

## Phase 4: Polish & Documentation

- [ ] Add loading skeletons for all data fetches
- [ ] Ensure consistent error handling (ErrorState component)
- [ ] Final UI review for spacing and responsiveness
- [ ] Create simple "How to allow-make a new page" guide for future developers
