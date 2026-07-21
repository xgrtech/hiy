-- Public buckets serve object URLs without a SELECT policy; the broad
-- policy only enabled listing the whole bucket (advisor 0025).
drop policy "avatars are publicly readable" on storage.objects;
