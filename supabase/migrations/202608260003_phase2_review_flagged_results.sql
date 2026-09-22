-- Keep evidence-grounded proposals for owner review instead of discarding them.
-- WITHHELD remains the review flag; no new table or status is introduced.

alter table public.terra_space_phase2_main_issues
  drop constraint terra_space_phase2_main_issues_valid_shape_check;

alter table public.terra_space_phase2_main_issues
  add constraint terra_space_phase2_main_issues_valid_shape_check check (
    (status = 'VALID'
      and nullif(btrim(issue_title), '') is not null
      and nullif(btrim(issue_description), '') is not null
      and nullif(btrim(evidence_quote), '') is not null
      and quote_validation_status = 'VERIFIED'
      and safeguard_status = 'ACCEPT')
    or (status = 'WITHHELD'
      and ((issue_title is null and issue_description is null and evidence_quote is null)
        or (nullif(btrim(issue_title), '') is not null
          and nullif(btrim(issue_description), '') is not null
          and nullif(btrim(evidence_quote), '') is not null
          and quote_validation_status = 'VERIFIED'
          and safeguard_status = 'REJECT')))
    or (status = 'FAILED'
      and issue_title is null
      and issue_description is null
      and evidence_quote is null)
  );

alter table public.terra_space_phase2_main_issue_processing_runs
  drop constraint terra_space_phase2_main_issue_processing_runs_valid_shape_check;

alter table public.terra_space_phase2_main_issue_processing_runs
  add constraint terra_space_phase2_main_issue_processing_runs_valid_shape_check check (
    (status = 'VALID'
      and nullif(btrim(issue_title), '') is not null
      and nullif(btrim(issue_description), '') is not null
      and nullif(btrim(evidence_quote), '') is not null
      and quote_validation_status = 'VERIFIED'
      and safeguard_status = 'ACCEPT')
    or (status = 'WITHHELD'
      and ((issue_title is null and issue_description is null and evidence_quote is null)
        or (nullif(btrim(issue_title), '') is not null
          and nullif(btrim(issue_description), '') is not null
          and nullif(btrim(evidence_quote), '') is not null
          and quote_validation_status = 'VERIFIED'
          and safeguard_status = 'REJECT')))
    or (status = 'FAILED'
      and issue_title is null
      and issue_description is null
      and evidence_quote is null)
  );

comment on column public.terra_space_phase2_main_issues.status is
  'VALID is verified and accepted. WITHHELD is a review flag that may retain an evidence-grounded proposed issue. FAILED is a technical failure.';

comment on column public.terra_space_phase2_main_issue_processing_runs.status is
  'VALID is verified and accepted. WITHHELD is a review flag that may retain an evidence-grounded proposed issue. FAILED is a technical failure.';
