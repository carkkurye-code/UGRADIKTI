import React, { useState } from 'react';
import { ReviewItem } from '@/lib/supabase';
import { Star, MessageSquare, CheckCircle, Send, User } from 'lucide-react';

interface PartnerReviewsTabProps {
  reviews: ReviewItem[];
  onSaveReply: (reviewId: string, replyText: string) => void;
}

export const PartnerReviewsTab: React.FC<PartnerReviewsTabProps> = ({
  reviews,
  onSaveReply
}) => {
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Calculate Average Rating
  const totalCount = reviews.length;
  const avgRating = totalCount > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / totalCount).toFixed(1)
    : '5.0';

  const handleSend = (reviewId: string) => {
    if (!replyText.trim()) return;
    onSaveReply(reviewId, replyText);
    setReplyingId(null);
    setReplyText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Müşteri Değerlendirmeleri</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sipariş veren müşterilerin yaptığı yorumlar ve puanlar.</p>
        </div>
      </div>

      {/* Average Rating Banner */}
      <div className="bg-[#111113] border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#161618] border border-[#242428] flex flex-col items-center justify-center shrink-0">
            <span className="text-2xl font-black text-white font-mono">{avgRating}</span>
            <div className="flex text-white">
              <Star className="w-3 h-3 fill-white" />
            </div>
          </div>

          <div>
            <h3 className="font-extrabold text-white text-base">Mağaza Puanı</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Toplam {totalCount} değerlendirme esas alınarak hesaplandı.</p>
            <div className="flex items-center gap-1 text-white mt-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className="w-4 h-4 fill-white" />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center sm:text-right border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Yorum Yanıtlama Oranı</span>
          <span className="text-xl font-black text-emerald-400 font-mono mt-1 block">
            %{totalCount > 0 ? Math.round((reviews.filter(r => r.reply).length / totalCount) * 100) : 100}
          </span>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-[#111113] border border-white/5 rounded-2xl">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Henüz bir müşteri yorumu bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(rev => (
            <div key={rev.id} className="bg-[#111113] border border-white/5 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{rev.customer_name}</h4>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(rev.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white/10 border border-white/20 px-2.5 py-1 rounded-lg text-white text-xs font-bold font-mono">
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span>{rev.rating}.0</span>
                </div>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed font-medium pl-13">
                "{rev.comment}"
              </p>

              {/* Existing Reply */}
              {rev.reply && (
                <div className="ml-13 bg-white/[0.02] border-l-2 border-l-primary border border-white/5 p-3 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mağaza Yanıtınız</span>
                    {rev.reply_at && (
                      <span className="text-[10px] text-muted-foreground font-mono font-normal ml-auto">
                        {new Date(rev.reply_at).toLocaleDateString('tr-TR')}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground italic">{rev.reply}</p>
                </div>
              )}

              {/* Reply Button or Reply Input */}
              {!rev.reply && (
                <div className="ml-13 pt-2">
                  {replyingId === rev.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Müşterinize vereceğiniz nazik ve profesyonel yanıt..."
                        rows={2.5}
                        className="w-full bg-white/[0.02] border border-white/5 focus:border-primary/50 outline-none rounded-xl p-3 text-xs text-foreground resize-none"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingId(null);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 rounded-lg text-xs font-semibold cursor-pointer border-0 text-muted-foreground"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSend(rev.id)}
                          className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-xs cursor-pointer flex items-center gap-1.5 border-0"
                        >
                          <Send className="w-3 h-3" /> Cevapla
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingId(rev.id);
                        setReplyText('');
                      }}
                      className="text-xs text-primary font-semibold hover:underline bg-transparent border-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Yoruma Yanıt Ver
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
