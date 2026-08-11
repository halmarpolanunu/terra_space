type ReadOnlyBridgeNoticeProps = {
  message?: string;
};

const DEFAULT_MESSAGE =
  "Read-only Supabase preview. This shows the live local pipeline data. Editing, approving, and reprocessing are turned off here.";

/** Shared banner for Sources, Event Review, Events, and Dashboard while they read Supabase
 * directly instead of the SQLite-backed application data. See
 * project-knowledge/plans/2026-08-11-supabase-read-only-bridge-design.md. */
export function ReadOnlyBridgeNotice({ message }: ReadOnlyBridgeNoticeProps) {
  return (
    <p className="read-only-bridge-notice" role="status">
      {message ?? DEFAULT_MESSAGE}
    </p>
  );
}
