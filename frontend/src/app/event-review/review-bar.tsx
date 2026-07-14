type ReviewBarProps = {
  documentIndex: number;
  documentCount: number;
  eventIndex: number;
  eventCount: number;
  onPrev: () => void;
  onSkip: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
};

export function ReviewBar({
  documentIndex,
  documentCount,
  eventIndex,
  eventCount,
  onPrev,
  onSkip,
  onNext,
  canPrev,
  canNext,
}: ReviewBarProps) {
  return (
    <div className="review-bar">
      <span className="review-bar-title">Event Review</span>
      <span className="review-bar-progress">
        Document {documentCount === 0 ? 0 : documentIndex + 1} of {documentCount}
      </span>
      <span className="review-bar-progress">
        Event {eventCount === 0 ? 0 : eventIndex + 1} of {eventCount}
      </span>
      <div className="review-bar-actions">
        <button className="btn" disabled={!canPrev} onClick={onPrev} type="button">
          Prev
        </button>
        <button className="btn" onClick={onSkip} type="button">
          Skip
        </button>
        <button className="btn" disabled={!canNext} onClick={onNext} type="button">
          Next
        </button>
      </div>
    </div>
  );
}
