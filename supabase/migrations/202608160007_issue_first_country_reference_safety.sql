-- Forward-only safety correction for the Issue-first endpoint country reference.
--
-- "Korea" is ambiguous: it occurs inside "North Korea" and must never validate as the
-- Republic of Korea (KOR).  The reference accepts the exact canonical wording "South Korea"
-- for KOR instead.  The static alpha-2-to-alpha-3 table is the project's canonical supported
-- code source; it includes ESH, so the SQL reference must include it too.

update public.terra_space_issue_v2_country_reference
   set country_name = 'South Korea'
 where country_iso3 = 'KOR'
   and country_name = 'Korea';

insert into public.terra_space_issue_v2_country_reference (country_iso3, country_name)
values ('ESH', 'Western Sahara')
on conflict (country_iso3) do update
  set country_name = excluded.country_name;

comment on table public.terra_space_issue_v2_country_reference is
  'Checked-in local country names paired with every ISO alpha-3 code in backend/app/data/iso3166_alpha2_to_alpha3.py. Names must exactly match an endpoint country claim; ambiguous generic names are excluded.';
