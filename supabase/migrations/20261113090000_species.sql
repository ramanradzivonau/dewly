-- Species picked when adding a plant: from Pl@ntNet (by photo) or iNaturalist (by name).
-- Kept per user like every other table; the AI care info for a species is cached here later.

create table public.species (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null check (source in ('plantnet', 'inaturalist')),
  external_id text check (char_length(external_id) <= 100),
  scientific_name text not null check (char_length(trim(scientific_name)) between 1 and 120),
  common_name text check (char_length(common_name) <= 120),
  image_url text check (char_length(image_url) <= 500 and image_url like 'https://%'),
  created_at timestamptz not null default now(),
  unique (user_id, scientific_name),
  unique (id, user_id)
);

create index species_user_id_idx on public.species (user_id);

alter table public.species enable row level security;

create policy "Users manage their own species"
  on public.species for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Upserted by scientific name, so the same species picked twice is one row.
grant select, delete on public.species to authenticated;
grant insert (source, external_id, scientific_name, common_name, image_url),
  update (source, external_id, common_name, image_url)
  on public.species to authenticated;

-- A plant's species; deleting the species keeps the plant.
alter table public.plants
  add column species_id uuid,
  add foreign key (species_id, user_id)
    references public.species (id, user_id) on delete set null (species_id);

create index plants_species_id_idx on public.plants (species_id);

grant insert (species_id), update (species_id) on public.plants to authenticated;
