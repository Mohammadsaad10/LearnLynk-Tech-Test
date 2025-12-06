-- LearnLynk Tech Test - Task 2: RLS Policies on leads

-- 0. Prerequisites (Mock Tables required for the Team logic to work)
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text
);

create table if not exists public.user_teams (
  user_id uuid not null, 
  team_id uuid references public.teams(id),
  primary key (user_id, team_id)
);

create index if not exists idx_user_teams_lookup on public.user_teams(user_id, team_id); --for faster lookups 

-- 1. Enable RLS on leads table
alter table public.leads enable row level security;

-- Example helper: assume JWT has tenant_id, user_id, role.
-- You can use: current_setting('request.jwt.claims', true)::jsonb

-- TODO: write a policy so:
-- - counselors see leads where they are owner_id OR in one of their teams
-- - admins can see all leads of their tenant


-- Example skeleton for SELECT (replace with your own logic):
-- 2. SELECT policy (read access)
create policy "leads_select_policy"
on public.leads
for select
using (
  -- TODO: add real RLS logic here, refer to README instructions
  --A] Strict tenant isolation (The lead must belong to the user's tenant(stored in jwt))
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid -- used supabase provided function as shorthand , to improve readability

  AND (
      -- B. Role-Based Logic
      
      -- 1. Admins see all leads in their tenant
      (auth.jwt() ->> 'role') = 'admin'
      
      OR
      
      -- 2. Counselors see their own leads
      owner_id = auth.uid()
      
      OR
      
      -- 3. Counselors see leads owned by someone in their team
      exists (
        select 1 
        from public.user_teams as my_teams
        join public.user_teams as owner_teams on my_teams.team_id = owner_teams.team_id
        where my_teams.user_id = auth.uid() -- My teams
        and owner_teams.user_id = leads.owner_id -- The lead owner's teams
      )
  )
);

-- TODO: add INSERT policy that:
-- - allows counselors/admins to insert leads for their tenant
-- - ensures tenant_id is correctly set/validated

-- 3. INSERT POLICY (Create Access)
-- Logic: Enforce Tenant + (Admin can assign anyone; Counselor assigns self/null)
create policy "leads_insert_policy"
on public.leads
for insert
with check (
  -- A. STRICT TENANT VALIDATION
  -- User can ONLY insert data into their own tenant.
  -- This prevents a malicious user from injecting data into another company's view.
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  
  AND (
      -- B. Assignment Logic
      
      -- 1. Admin can assign the lead to anyone (or leave null)
      (auth.jwt() ->> 'role') = 'admin'
      
      OR
      
      -- 2. Counselor can only assign to themselves OR leave unassigned (can not assign to others)
      (owner_id = auth.uid() OR owner_id IS NULL)
  )
);
