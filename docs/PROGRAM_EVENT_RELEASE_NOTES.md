# PR #94 event scheduling release audit

Migration adds program event_start_at/event_end_at/registration_opens_at and announcement event_start_at/event_end_at/venue (timestamptz). All resident-facing event dates display Asia/Manila. Admin inputs are datetime-local and should be entered using Philippine local time.

**Release order:** apply reviewed migration, deploy admin and PWA, test admin publish -> resident apply -> staff approve/reject -> attendance. Never deploy frontend first.

**Safety:** published Active programs require confirmed event dates and venue; registration requires future event and deadline; insert guard locks the program row to prevent oversubscription under concurrent requests. Announcement Event/Program publishing requires dates and venue. Legacy published event announcements without dates must be reviewed before edits. Research catalog records remain unpublished, On Hold, registration closed.

**Not yet included/verified:** scheduled push reminders, automatic delivery confirmation, authenticated production E2E, and full official barangay program inventory. Existing application status/review and attendance workflows are reused. Dates for real barangay activities require staff verification.
