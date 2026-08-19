-- Data fix: Convert pending test relationship for VKN 40000000005 to active
--
-- Since we reverted the guest manufacturer approval requirement, the existing
-- test relationship that was created in 'pending' state should be updated to 'active'
-- (or deleted) so it does not stay in 'pending' state on the UI.

update public.relationships r
set status = 'active', activated_at = now()
where status = 'pending'
  and (
    r.manufacturer_org_id in (select id from public.organizations where vkn_tc = '40000000005')
    or r.retailer_org_id in (select id from public.organizations where vkn_tc = '40000000005')
  );

notify pgrst, 'reload schema';
