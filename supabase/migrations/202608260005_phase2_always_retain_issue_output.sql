-- Every Phase 2 result keeps an Issue payload. NEEDS_REVIEW explains uncertainty; it does not erase data.

alter table public.terra_space_phase2_main_issues
  drop constraint terra_space_phase2_main_issues_valid_shape_check;

alter table public.terra_space_phase2_main_issue_processing_runs
  drop constraint terra_space_phase2_main_issue_processing_runs_valid_shape_check;

-- Restore the two latest rows that were saved by the former field-clearing paths.
update public.terra_space_phase2_main_issues
set
  status = 'NEEDS_REVIEW',
  issue_title = 'Trump demands war reparations from Iran',
  issue_description = 'President Donald Trump has announced that the United States will seek financial compensation from Iran for damages and deaths allegedly caused by the country over a 50-year period.',
  evidence_quote = 'Well, we’re going to ask for money for the damage they’ve done over a 50-year period.',
  quote_validation_status = 'VERIFIED',
  safeguard_status = 'FAILED'
where id = '4d3e7e89-368d-4296-a0bc-a655a27f1594';

update public.terra_space_phase2_main_issues
set
  issue_title = 'Interception of a foreign drone in Latvian airspace',
  issue_description = 'NATO fighter jets intercepted and neutralized a foreign drone in eastern Latvia that entered the country’s airspace due to Russian electromagnetic warfare.',
  evidence_quote = 'After positive identification, one of the Italian Eurofighters neutralised the potential threat over an unpopulated area.',
  quote_validation_status = 'REJECTED',
  safeguard_status = 'NOT_RUN'
where id = '81d625a3-698a-4a05-b51d-53a07ff61b59';

alter table public.terra_space_phase2_main_issues
  add constraint terra_space_phase2_main_issues_valid_shape_check check (
    (status = 'VALID'
      and nullif(btrim(issue_title), '') is not null
      and nullif(btrim(issue_description), '') is not null
      and nullif(btrim(evidence_quote), '') is not null
      and quote_validation_status = 'VERIFIED'
      and safeguard_status = 'ACCEPT')
    or (status = 'NEEDS_REVIEW'
      and nullif(btrim(issue_title), '') is not null
      and nullif(btrim(issue_description), '') is not null
      and nullif(btrim(evidence_quote), '') is not null)
    or (status = 'FAILED'
      and issue_title is null
      and issue_description is null
      and evidence_quote is null)
  );

alter table public.terra_space_phase2_main_issue_processing_runs
  add constraint terra_space_phase2_main_issue_processing_runs_valid_shape_check check (
    (status = 'VALID'
      and nullif(btrim(issue_title), '') is not null
      and nullif(btrim(issue_description), '') is not null
      and nullif(btrim(evidence_quote), '') is not null
      and quote_validation_status = 'VERIFIED'
      and safeguard_status = 'ACCEPT')
    or (status = 'NEEDS_REVIEW'
      and ((issue_title is null and issue_description is null and evidence_quote is null)
        or (nullif(btrim(issue_title), '') is not null
          and nullif(btrim(issue_description), '') is not null
          and nullif(btrim(evidence_quote), '') is not null)))
    or (status = 'FAILED'
      and issue_title is null
      and issue_description is null
      and evidence_quote is null)
  );
