# Mobile Architecture

## Purpose

This document defines the mobile strategy for Smart Barangay.

## Overview

The mobile experience may be delivered as a React Native app or a progressive web app. It focuses on resident self-service, push notifications, request tracking, AI assistance, and future field staff workflows.

## Architecture

| Layer | Responsibility |
| --- | --- |
| Presentation | Mobile screens, navigation, accessible controls |
| State | Auth session, request cache, offline queue where supported |
| API | Shared API client against FastAPI |
| Notifications | Firebase Cloud Messaging registration and handling |
| Storage | Secure local storage for session tokens and small cached data |

## Implementation Details

Mobile workflows should include onboarding, login, service browsing, request submission, attachment upload, request status timeline, announcements, notifications, and AI chat. Field workflows may include assigned visits, notes, and offline submission sync.

## Design Decisions

A PWA is viable for rapid deployment and low-friction access. React Native is preferred if native push reliability, file handling, camera integration, and offline field workflows become central requirements.

## Advantages

- Improves access for residents who primarily use phones.
- Supports push notifications for request updates and alerts.
- Can evolve toward field operations.

## Disadvantages

- Native app stores add review and release overhead.
- Offline support increases complexity.
- Device token management requires ongoing maintenance.

## Security Considerations

Store tokens in secure platform storage. Avoid persisting sensitive resident data offline unless encrypted and approved. Lock screens should not expose private notification content by default.

## Performance Considerations

Optimize for low-end Android devices and variable mobile networks. Compress uploads, retry transient failures, and keep screens responsive while requests are in flight.

## Future Improvements

- Add offline request drafts.
- Add camera-based document capture.
- Add biometric unlock for staff accounts.
- Add location-aware field workflows only after privacy review.

## References

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)
- [NOTIFICATIONS section in SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
- [SECURITY.md](SECURITY.md)
- [PERFORMANCE.md](PERFORMANCE.md)

