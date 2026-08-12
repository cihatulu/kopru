-- Migration to add can_edit_catalog column to relationships
alter table public.relationships
  add column if not exists can_edit_catalog boolean not null default true;
