-- Align tier rows with the published pricing page (Starter/Plus/Pro/Business)
-- and give EVERY tier an explicit monthly_messages ceiling so a viral twin
-- can never out-spend its subscription: at ~1.2¢ per chat answer, the caps
-- below keep worst-case model spend under each tier's price.
-- Business is BYOK ("bring your own model keys"), so its huge caps are a
-- safety backstop, not a spend bound.
insert into public.tiers (id, name, caps) values
  ('plus', 'Plus', '{"max_words": 500000, "max_sources": 250, "monthly_messages": 1500, "branding": true, "inline_embed": true, "bubble_embed": true, "full_analytics": true}'),
  ('business', 'Business', '{"max_words": 10000000, "max_sources": 10000, "monthly_messages": 100000, "branding": false, "inline_embed": true, "bubble_embed": true, "full_analytics": true}')
on conflict (id) do update set name = excluded.name, caps = excluded.caps;

update public.tiers
set caps = '{"max_words": 2000000, "max_sources": 1000, "monthly_messages": 5000, "branding": false, "inline_embed": true, "bubble_embed": true, "full_analytics": true}'
where id = 'pro';
