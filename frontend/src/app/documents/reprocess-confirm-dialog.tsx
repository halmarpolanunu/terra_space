type ReprocessConfirmDialogProps = {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReprocessConfirmDialog({ count, onCancel, onConfirm }: ReprocessConfirmDialogProps) {
  const subject = count === 1 ? "1 selected document has" : `${count} selected documents have`;

  return (
    <div className="panel" role="alertdialog">
      <p className="panel-title">Confirm reprocessing</p>
      <p>
        {subject} approved events. Reprocessing will not change those approved events, but new
        draft events may be created for review.
      </p>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={onConfirm} type="button">
          Reprocess anyway
        </button>
        <button className="btn" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}
