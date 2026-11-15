-- Existing announcements has description and category, not body/target_audience.
-- Preserve invoker's authenticated staff RLS when publishing new notifications.
CREATE OR REPLACE FUNCTION public.notify_residents_on_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.status = 'Published' AND
     (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'Published')) THEN
    INSERT INTO public.notifications (user_id, title, message)
    SELECT DISTINCT r.user_id,
           LEFT('New Announcement: ' || NEW.title, 255),
           NEW.description
    FROM public.residents r
    WHERE r.user_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$function$;
