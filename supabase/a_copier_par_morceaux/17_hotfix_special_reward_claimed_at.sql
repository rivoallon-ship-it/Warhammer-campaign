-- Correctif si la révélation échoue avec :
-- column t.special_reward_claimed_at does not exist
alter table public.territories
add column if not exists special_reward_claimed_at timestamptz;
