import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Send, RotateCcw, CheckCircle2, AlertCircle, Tv, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface MobileWishSubmissionProps {
  onNavigateToDisplay?: () => void;
}

export const MobileWishSubmission: React.FC<MobileWishSubmissionProps> = ({
  onNavigateToDisplay,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedWish, setSubmittedWish] = useState<{
    id: string;
    moderation_enabled: boolean;
  } | null>(null);

  const charLimit = 300;
  const charsRemaining = charLimit - content.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmed = content.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập nội dung điều ước.');
      return;
    }

    if (trimmed.length > charLimit) {
      setErrorMessage(`Điều ước tối đa ${charLimit} ký tự.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.submitWish(trimmed);

      // Trigger celebratory Nam A Bank bright golden confetti
      try {
        confetti({
          particleCount: 75,
          spread: 80,
          origin: { y: 0.65 },
          colors: ['#FDB913', '#F5A623', '#FFD700', '#F59E0B', '#FFFFFF', '#16A34A'],
        });
      } catch (err) {
        // Fallback gracefully
      }

      setSubmittedWish({
        id: res.wish.id,
        moderation_enabled: res.moderation_enabled,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setContent('');
    setSubmittedWish(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#FFFDF5] via-[#FFF9E6] to-[#FEF3C7] text-[#1F2937] flex flex-col items-center justify-between px-4 py-8 relative overflow-x-hidden selection:bg-[#FDE68A]">
      {/* Background ambient warm golden sunshine glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-gradient-to-b from-[#FDB913]/25 via-[#F59E0B]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[300px] h-[300px] bg-gradient-to-t from-[#FFD700]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[240px] h-[240px] bg-gradient-to-r from-[#FDE68A]/30 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Main Content Container (Mobile-first, max-w-md) */}
      <div className="w-full max-w-md mx-auto my-auto z-10 py-2">
        {/* Brand / Event Header in Nam A Bank Golden Identity */}
        <div className="text-center mb-6">
          {/* Nam A Bank Golden Emblem */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-[#FFC72C] via-[#FDB913] to-[#E69500] border-2 border-white shadow-[0_8px_30px_rgba(253,185,19,0.4)] mb-3 transition-transform hover:scale-105 duration-300">
            <svg
              className="w-9 h-9 text-white drop-shadow-[0_2px_4px_rgba(180,83,9,0.4)]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#002B49] font-display tracking-tight drop-shadow-sm">
            CÂY TRÀ NGUYỆN ƯỚC
          </h1>
          <p className="mt-1 text-sm text-[#B45309] font-medium max-w-xs mx-auto">
            Gửi một điều ước, gieo một chiếc lá yêu thương
          </p>
        </div>

        {/* Dynamic Card: Submission Form or Confirmation View */}
        {!submittedWish ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white/95 backdrop-blur-md border border-[#FDE68A] rounded-3xl p-6 sm:p-7 shadow-[0_12px_40px_rgba(217,119,6,0.12)] space-y-4"
          >
            {/* Input Label & Live Character Counter */}
            <div className="flex items-center justify-between">
              <label
                htmlFor="wish-input"
                className="text-sm font-bold text-[#1F2937] tracking-wide flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                <span>Điều ước của bạn</span>
              </label>
              <span
                className={`text-xs font-mono tabular-nums ${
                  charsRemaining < 20
                    ? 'text-red-500 font-bold'
                    : 'text-[#92400E]'
                }`}
              >
                {content.length}/{charLimit}
              </span>
            </div>

            {/* Multiline Text Area */}
            <div className="relative">
              <textarea
                id="wish-input"
                rows={5}
                value={content}
                maxLength={charLimit}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Hãy viết điều bạn muốn gửi gắm đến tập thể và tương lai..."
                disabled={isSubmitting}
                className="w-full bg-[#FFFDF5] border-2 border-[#FDE68A] focus:border-[#F59E0B] rounded-2xl p-4 text-[#1F2937] placeholder-[#9CA3AF] text-base leading-relaxed focus:outline-none focus:ring-4 focus:ring-[#FEF08A]/60 shadow-inner resize-none transition-all"
              />
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Primary Submit Button with Radiant Nam A Bank Gold */}
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl shadow-[#F59E0B]/30 cursor-pointer bg-gradient-to-r from-[#F59E0B] via-[#E59800] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white border border-[#FDE68A] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>ĐANG GỬI ĐIỀU ƯỚC...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>GỬI ĐIỀU ƯỚC</span>
                </>
              )}
            </button>

            {/* Privacy note */}
            <p className="text-[11px] text-center text-[#9CA3AF] leading-normal pt-1">
              Lời nguyện ước ẩn danh và không lưu thông tin cá nhân.
            </p>
          </form>
        ) : (
          /* Confirmation Success View in Bright Nam A Bank Gold */
          <div className="bg-white/95 backdrop-blur-md border border-[#FDE68A] rounded-3xl p-6 sm:p-8 text-center shadow-[0_12px_40px_rgba(217,119,6,0.15)] space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Animated Golden Tea Leaf Bloom */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-[#FDB913]/25 animate-ping opacity-75" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FFC72C] to-[#E69500] border-2 border-[#FEF08A] flex items-center justify-center shadow-[0_0_35px_rgba(253,185,19,0.5)]">
                <svg
                  className="w-10 h-10 text-white animate-bounce"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-xs font-bold tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-[#D97706]" />
                <span>THÀNH CÔNG</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#002B49] font-display">
                ĐIỀU ƯỚC CỦA BẠN ĐÃ ĐƯỢC GỬI THÀNH CÔNG!
              </h2>
              <p className="text-sm text-[#4B5563] leading-relaxed max-w-xs mx-auto">
                {!submittedWish.moderation_enabled
                  ? 'Điều ước của bạn đang trở thành một chiếc lá trên Cây Trà Nguyện Ước.'
                  : 'Điều ước của bạn đã được ghi nhận và sẽ xuất hiện sau khi được duyệt.'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-[#F59E0B] via-[#E59800] to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-white border border-[#FDE68A] cursor-pointer shadow-lg shadow-[#F59E0B]/25 active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-white" />
                <span>GỬI ĐIỀU ƯỚC KHÁC</span>
              </button>

              {onNavigateToDisplay && (
                <button
                  type="button"
                  onClick={onNavigateToDisplay}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-xs text-[#92400E] hover:text-[#B45309] hover:bg-[#FEF3C7]/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>Xem màn hình sân khấu</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer info in elegant muted gold */}
      <footer className="mt-6 text-center text-xs text-[#92400E]/70 z-10 flex items-center justify-center gap-2 font-medium">
        <span>Cây Trà Nguyện Ước</span>
        <span>·</span>
        <span>Sự kiện tương tác trực tiếp</span>
      </footer>
    </div>
  );
};
