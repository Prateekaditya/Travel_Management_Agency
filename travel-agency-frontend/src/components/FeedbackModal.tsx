import React, { useState } from 'react';

interface FeedbackModalProps {
  initialRating?: number;
  initialComment?: string;
  isFlagged?: boolean;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}

const MAX_COMMENT = 500;

/** Renders a star that can be empty, half-filled, or fully filled */
const StarSvg: React.FC<{ fill: 'empty' | 'half' | 'full' }> = ({ fill }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="half-clip">
        <rect x="0" y="0" width="12" height="24" />
      </clipPath>
    </defs>
    {/* Outline star */}
    <path
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
      stroke="#0B3857"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Half fill */}
    {fill === 'half' && (
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill="#0B3857"
        clipPath="url(#half-clip)"
      />
    )}
    {/* Full fill */}
    {fill === 'full' && (
      <path
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
        fill="#0B3857"
      />
    )}
  </svg>
);

function getFill(star: number, value: number): 'empty' | 'half' | 'full' {
  if (value >= star) return 'full';
  if (value >= star - 0.5) return 'half';
  return 'empty';
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  initialRating = 0,
  initialComment = '',
  isFlagged = false,
  onSubmit,
  onClose,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(initialComment ?? '');
  const [submitting, setSubmitting] = useState(false);

  const display = hovered || rating;
  const commentRequired = rating > 0 && rating <= 3;
  const canSubmit = rating > 0 && !submitting && (!commentRequired || comment.trim().length > 0);

  const handleStarClick = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;
    setRating(isLeft ? star - 0.5 : star);
  };

  const handleStarHover = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;
    setHovered(isLeft ? star - 0.5 : star);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white shadow-xl flex flex-col"
        style={{ width: 544, borderRadius: 12, padding: 24, gap: 32 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-[#0B3857]">Feedback</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Flagged review warning banner ── */}
        {isFlagged && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>
              <strong>Your previous feedback was flagged for review.</strong> Please update your comment and resubmit.
            </span>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex flex-col flex-1" style={{ gap: 24 }}>
          {/* Star rating */}
          <div>
            <p className="text-sm font-semibold text-[#0B3857] mb-3">Please rate your experience*</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onMouseMove={e => handleStarHover(star, e)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={e => handleStarClick(star, e)}
                    className="p-0 bg-transparent border-none cursor-pointer leading-none"
                    aria-label={`Rate ${star} stars`}
                  >
                    <StarSvg fill={getFill(star, display)} />
                  </button>
                ))}
              </div>
              <span className="text-sm font-medium" style={{ color: '#0B3857' }}>
                {display}/5 stars
              </span>
            </div>
          </div>

          {/* Comment */}
          <div className="flex flex-col flex-1" style={{ gap: 6 }}>
            <label className="text-sm font-semibold text-[#0B3857]">
              Comment{commentRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            {commentRequired && (
              <p className="text-xs text-red-500 -mt-1">A comment is required for ratings of 3 stars or below.</p>
            )}
            <div className="relative flex-1">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, MAX_COMMENT))}
                placeholder="Add your comments"
                className="w-full h-full resize-none border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#027EAC] focus:ring-1 focus:ring-[#027EAC]"
                style={{ minHeight: 100 }}
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                {comment.length}/{MAX_COMMENT}
              </span>
            </div>
          </div>
        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full border-2 border-[#027EAC] text-[#027EAC] font-semibold text-sm hover:bg-[#E7F9FF] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-3 rounded-full font-semibold text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#027EAC' }}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
