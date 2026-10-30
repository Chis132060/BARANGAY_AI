-- Keep the document request status constraint in sync with the admin workflow.
-- The UI and canonical schema include Ready for Pickup, but the live constraint
-- omitted it and rejected valid staff status transitions.
ALTER TABLE public.document_requests
  DROP CONSTRAINT IF EXISTS document_requests_status_check;

ALTER TABLE public.document_requests
  ADD CONSTRAINT document_requests_status_check
  CHECK (status IN (
    'Pending',
    'Under Review',
    'Approved',
    'Ready for Pickup',
    'Released',
    'Completed',
    'Rejected'
  ));
