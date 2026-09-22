-- Rename the plain-language review flag without discarding any result or history.

alter table public.terra_space_phase2_main_issues
  drop constraint terra_space_phase2_main_issues_status_check;

alter table public.terra_space_phase2_main_issue_processing_runs
  drop constraint terra_space_phase2_main_issue_processing_runs_status_check;

alter table public.terra_space_phase2_main_issues
  drop constraint terra_space_phase2_main_issues_valid_shape_check;

alter table public.terra_space_phase2_main_issue_processing_runs
  drop constraint terra_space_phase2_main_issue_processing_runs_valid_shape_check;

update public.terra_space_phase2_main_issues
set status = 'NEEDS_REVIEW'
where status = 'WITHHELD';

update public.terra_space_phase2_main_issue_processing_runs
set status = 'NEEDS_REVIEW'
where status = 'WITHHELD';

alter table public.terra_space_phase2_main_issues
  add constraint terra_space_phase2_main_issues_status_check
    check (status in ('VALID', 'NEEDS_REVIEW', 'FAILED')),
  add constraint terra_space_phase2_main_issues_valid_shape_check check (
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
          and nullif(btrim(evidence_quote), '') is not null
          and quote_validation_status = 'VERIFIED'
          and safeguard_status = 'REJECT')))
    or (status = 'FAILED'
      and issue_title is null
      and issue_description is null
      and evidence_quote is null)
  );

alter table public.terra_space_phase2_main_issue_processing_runs
  add constraint terra_space_phase2_main_issue_processing_runs_status_check
    check (status in ('VALID', 'NEEDS_REVIEW', 'FAILED')),
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
          and nullif(btrim(evidence_quote), '') is not null
          and quote_validation_status = 'VERIFIED'
          and safeguard_status = 'REJECT')))
    or (status = 'FAILED'
      and issue_title is null
      and issue_description is null
      and evidence_quote is null)
  );

comment on column public.terra_space_phase2_main_issues.status is
  'VALID is verified and accepted. NEEDS_REVIEW flags a result to check later and may retain an evidence-grounded proposed issue. FAILED is a technical failure.';

comment on column public.terra_space_phase2_main_issue_processing_runs.status is
  'VALID is verified and accepted. NEEDS_REVIEW flags a result to check later and may retain an evidence-grounded proposed issue. FAILED is a technical failure.';
