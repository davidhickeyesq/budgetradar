# Future Roadmap

This document outlines the next planned features and technical improvements for the Marginal Efficiency Radar.

## Phase 1: Core Functionality (Completed v2.0.0)
- [x] Docker Compose Local Environment
- [x] Hill Function Curve Fitting
- [x] Traffic Light System
- [x] CSV Data Import
- [x] Documentation & Developer Experience

## Phase 2: Scenario Planning (Next)
- [ ] **"What-If" Simulator Page**: UI sliders to adjust budget per channel.
- [ ] **Revenue Projection**: Visualize estimated revenue based on fitted curves.
- [ ] **Budget Saving**: Ability to save multiple scenario configurations.

## Phase 3: Advanced Analytics
- [ ] **Seasonality Adjustments**: Incorporate time-of-year factors into the model.
- [ ] **Lagged Effects**: Better visualization of adstock decay impact.
- [ ] **Confidence Intervals**: Show error bars/ranges on predictions.

## Phase 4: Production Hygiene
- [ ] **Auth Implementation**: Add user authentication (NextAuth or Supabase Auth).
- [ ] **CI/CD Pipeline**: GitHub Actions for automated testing.
- [ ] **Cloud Deployment**: Formalize the Supabase + Vercel deployment path.

---

## Maintenance & Tech Debt
- [ ] Increase unit test coverage > 80%.
- [ ] Add end-to-end (E2E) tests with Playwright.
- [ ]Optimize specific SQL queries for large datasets.
