-- Fix announcement trigger: column is 'body' not 'description'
-- Also add audience targeting to notifications

CREATE OR REPLACE FUNCTION notify_residents_on_announcement()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if status transitions to 'Published'
    IF NEW.status = 'Published' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Published') THEN
        INSERT INTO notifications (user_id, title, message)
        SELECT r.user_id,
               'New Announcement: ' || NEW.title,
               COALESCE(NEW.body, NEW.description, '')
        FROM residents r
        WHERE r.user_id IS NOT NULL
          AND (
              NEW.target_audience = 'All'
              OR NEW.target_audience IS NULL
              OR (NEW.target_audience = 'Senior' AND r.is_senior_citizen = true)
              OR (NEW.target_audience = '4Ps'    AND r.is_4ps_member = true)
          );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS announcement_published_trigger ON announcements;
CREATE TRIGGER announcement_published_trigger
    AFTER INSERT OR UPDATE OF status ON announcements
    FOR EACH ROW EXECUTE FUNCTION notify_residents_on_announcement();
