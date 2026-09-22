-- Adds human-readable descriptions only; no table data or workflow behavior changes.
comment on column public.terra_space_phase1_sources.title is 'Headline or title supplied with this source article.';
comment on column public.terra_space_phase1_sources.source_domain is 'Publisher or website name for the source article.';
comment on column public.terra_space_phase1_sources.source_url is 'Original web address used to identify this source article.';
comment on column public.terra_space_phase1_sources.author is 'Author or byline supplied by the publisher; may be blank.';
comment on column public.terra_space_phase1_sources.created_at is 'When this source row was first saved locally.';
comment on column public.terra_space_phase1_sources.updated_at is 'When this source row was last changed locally.';

comment on column public.terra_space_phase1_processing_runs.run_id is 'Permanent counting identifier for this append-only processing attempt.';
comment on column public.terra_space_phase1_processing_runs.phase1_source_id is 'Source article processed by this attempt; becomes blank only if that source is later deleted.';
comment on column public.terra_space_phase1_processing_runs.model_name is 'Local LM Studio model used for this cleaning attempt.';
comment on column public.terra_space_phase1_processing_runs.prompt_version is 'Named version of the cleaning instructions used for this attempt.';
comment on column public.terra_space_phase1_processing_runs.cleaned_character_count is 'Number of characters in the cleaned text saved by this attempt.';
comment on column public.terra_space_phase1_processing_runs.processed_at is 'When this cleaning attempt finished.';

comment on column public.terra_space_phase2_main_issues.id is 'Permanent identifier for this latest Main Issue result.';
comment on column public.terra_space_phase2_main_issues.phase1_source_id is 'Completed Phase 1 source article this Main Issue describes.';
comment on column public.terra_space_phase2_main_issues.issue_title is 'Short neutral title for a valid Main Issue; blank when withheld or failed.';
comment on column public.terra_space_phase2_main_issues.issue_description is 'One neutral sentence describing a valid Main Issue; blank when withheld or failed.';
comment on column public.terra_space_phase2_main_issues.evidence_quote is 'Exact quote from cleaned article text supporting a valid Main Issue.';
comment on column public.terra_space_phase2_main_issues.quote_validation_status is 'Whether the evidence quote was found verbatim in the cleaned article.';
comment on column public.terra_space_phase2_main_issues.safeguard_status is 'Independent local-AI safeguard decision for the proposed Main Issue.';
comment on column public.terra_space_phase2_main_issues.model_name is 'Local LM Studio model used for Main Issue detection and safeguard.';
comment on column public.terra_space_phase2_main_issues.detection_prompt_version is 'Named version of the Main Issue detector instructions.';
comment on column public.terra_space_phase2_main_issues.safeguard_prompt_version is 'Named version of the independent safeguard instructions.';
comment on column public.terra_space_phase2_main_issues.detection_raw_output is 'Exact unmodified response from the Main Issue detector model.';
comment on column public.terra_space_phase2_main_issues.safeguard_raw_output is 'Exact unmodified response from the Main Issue safeguard model.';
comment on column public.terra_space_phase2_main_issues.error_message is 'Reason a result was withheld or failed; blank for an accepted valid result.';
comment on column public.terra_space_phase2_main_issues.processed_at is 'When this Main Issue result was produced.';
comment on column public.terra_space_phase2_main_issues.created_at is 'When this latest-result row was first saved.';
comment on column public.terra_space_phase2_main_issues.updated_at is 'When this latest-result row was last changed.';

comment on column public.terra_space_phase2_main_issue_processing_runs.run_id is 'Permanent counting identifier for this append-only Phase 2 attempt.';
comment on column public.terra_space_phase2_main_issue_processing_runs.phase1_source_id is 'Source article processed by this attempt; blank only if that source is later deleted.';
comment on column public.terra_space_phase2_main_issue_processing_runs.submission_key is 'Unique identifier for one Phase 2 processing attempt.';
comment on column public.terra_space_phase2_main_issue_processing_runs.status is 'Final outcome of this attempt: VALID, WITHHELD, or FAILED.';
comment on column public.terra_space_phase2_main_issue_processing_runs.issue_title is 'Short neutral title saved only for a valid Main Issue.';
comment on column public.terra_space_phase2_main_issue_processing_runs.issue_description is 'Neutral one-sentence description saved only for a valid Main Issue.';
comment on column public.terra_space_phase2_main_issue_processing_runs.evidence_quote is 'Exact article quote saved only for a valid Main Issue.';
comment on column public.terra_space_phase2_main_issue_processing_runs.quote_validation_status is 'Whether this attempt found its evidence quote verbatim in the cleaned article.';
comment on column public.terra_space_phase2_main_issue_processing_runs.safeguard_status is 'Independent local-AI safeguard decision for this attempt.';
comment on column public.terra_space_phase2_main_issue_processing_runs.model_name is 'Local LM Studio model used by this attempt.';
comment on column public.terra_space_phase2_main_issue_processing_runs.detection_prompt_version is 'Named version of the Main Issue detector instructions.';
comment on column public.terra_space_phase2_main_issue_processing_runs.safeguard_prompt_version is 'Named version of the safeguard instructions.';
comment on column public.terra_space_phase2_main_issue_processing_runs.detection_raw_output is 'Exact unmodified response from the detector model.';
comment on column public.terra_space_phase2_main_issue_processing_runs.safeguard_raw_output is 'Exact unmodified response from the safeguard model.';
comment on column public.terra_space_phase2_main_issue_processing_runs.error_message is 'Reason this attempt was withheld or failed; blank when valid.';
comment on column public.terra_space_phase2_main_issue_processing_runs.processed_at is 'When this processing attempt finished.';
