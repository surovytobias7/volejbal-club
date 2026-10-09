-- Stable newest-first keyset traversal, including equal timestamps.
create index notifications_history_idx on public.notifications(recipient_id, created_at desc, id desc);
create index audit_history_idx on public.audit_logs(created_at desc, id desc);
