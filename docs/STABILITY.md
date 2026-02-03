# System Stability & Scalability Measures

## Overview
This document outlines the stability measures implemented to ensure the Machine Checklist App can handle high-volume usage (100+ scans/day).

## 1. Data Integrity & File Handling
- **Relative Path Storage**: All uploaded files (Photos, Proofs, Logos) are stored in the database as relative paths (`uploads/filename.ext`). This ensures portability between local development and cloud (Railway) environments.
- **Null Safety**: Frontend components gracefully handle missing or null image paths, displaying "No Photo" placeholders instead of crashing.

## 2. Scalability Guardrails
### Backend (Node.js/Express)
- **Export Limits**: CSV Exports are capped at **5000 records** per download to prevent Server Out-of-Memory (OOM) crashes.
- **Audit Logging**: All critical actions (Edits, Deletes) are logged.

### Frontend (React)
- **Socket Throttling**: The Admin Dashboard employs **debouncing (2000ms delay)** for real-time updates. If 50 scans happen in 1 second, the dashboard will refresh only *once* after the burst finishes, preventing API overload.
- **Lazy Loading**: (Planned) Lists fetch only the most recent 50 items by default.

## 3. Deployment Reliability
- **CI/CD**: GitHub Actions automatically builds the Android APK.
- **Railway**: Cloud hosting manages process restarts.

## Future Recommendations (500k+ Scale)
1. **S3 Storage**: Move from local disk (`/uploads`) to AWS S3 / Cloudinary for infinite storage.
2. **Pagination**: Implement `OFFSET/LIMIT` on the `/checklists` API instead of hardcoded limits.
3. **Redis**: Cache analytics queries (`/stats/trend`) to reduce DB load.
