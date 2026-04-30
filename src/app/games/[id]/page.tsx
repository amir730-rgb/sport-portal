"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import toast from "react-hot-toast";
import clsx from "clsx";
import { use } from "react";

type Post = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
};

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  createdAt: string;
  user: { id: string; name: string | null };
};

type Survey = {
  id: string;
  isOpen: boolean;
  // isDraw is repurposed as "isBalanced" vote storage
  votes: Array<{ userId: string; isDraw: boolean }>;
  mvpVotes: Array<{ voterId: string; receiver: { id: string; name: string | null; image: string | null } }>;
  game: {
    rsvps: Array<{ user: { id: string; name: string | null } }>;
  };
};

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "chat");
  const [posts, setPosts] = useState<Post[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [surveyForm, setSurveyForm] = useState<{ isBalanced: boolean | null; mvpUserId: string }>({ isBalanced: null, mvpUserId: "" });
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = (session?.user as { id?: string })?.id;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchPosts();
      fetchPhotos();
      fetchSurvey();
    }
  }, [session, id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  async function fetchPosts() {
    const res = await fetch(`/api/games/${id}/posts`);
    if (res.ok) setPosts(await res.json());
  }

  async function fetchPhotos() {
    const res = await fetch(`/api/games/${id}/photos`);
    if (res.ok) setPhotos(await res.json());
  }

  async function fetchSurvey() {
    const res = await fetch(`/api/games/${id}/survey`);
    if (res.ok) {
      const data = await res.json();
      setSurvey(data);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/games/${id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage }),
    });
    if (res.ok) {
      setNewMessage("");
      fetchPosts();
    } else {
      toast.error("שגיאה בשליחת הודעה");
    }
    setLoading(false);
  }

  async function uploadPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!photoUrl.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/games/${id}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: photoUrl, caption: photoCaption }),
    });
    if (res.ok) {
      toast.success("תמונה נוספה! 📸");
      setPhotoUrl("");
      setPhotoCaption("");
      fetchPhotos();
    } else {
      toast.error("שגיאה בהוספת תמונה");
    }
    setLoading(false);
  }

  async function submitSurvey(e: React.FormEvent) {
    e.preventDefault();
    if (surveyForm.isBalanced === null) {
      toast.error("נא לענות על שאלת האיזון");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/games/${id}/survey`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBalanced: surveyForm.isBalanced, mvpUserId: surveyForm.mvpUserId }),
    });
    if (res.ok) {
      toast.success("הצבעתך נקלטה! תודה");
      fetchSurvey();
    } else {
      toast.error("שגיאה");
    }
    setLoading(false);
  }

  const myVote = survey?.votes.find((v) => v.userId === userId);
  const myMvpVote = survey?.mvpVotes.find((v) => v.voterId === userId);
  const tabs = [
    { id: "chat", label: "צ'אט", count: posts.length },
    { id: "photos", label: "תמונות", count: photos.length },
    { id: "survey", label: "סקר", count: null, highlight: survey?.isOpen && !myVote },
  ];

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm">
        → חזרה
      </button>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl border border-slate-100 p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all relative",
              activeTab === tab.id
                ? "bg-green-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={clsx(
                "mr-1.5 px-1.5 py-0.5 rounded-full text-xs",
                activeTab === tab.id ? "bg-white/30" : "bg-slate-100 text-slate-500"
              )}>
                {tab.count}
              </span>
            )}
            {tab.highlight && (
              <span className="absolute top-1 left-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4">💬 לוח הודעות</h2>

          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {posts.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                עדיין אין הודעות. היה הראשון! 👋
              </p>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className={clsx(
                    "flex gap-3",
                    post.user.id === userId ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm shrink-0">
                    {post.user.name?.[0] || "?"}
                  </div>
                  <div className={clsx(
                    "max-w-[75%]",
                    post.user.id === userId ? "items-end" : "items-start",
                    "flex flex-col"
                  )}>
                    <div className={clsx(
                      "px-3 py-2 rounded-2xl text-sm",
                      post.user.id === userId
                        ? "bg-green-500 text-white"
                        : "bg-slate-100 text-slate-800"
                    )}>
                      {post.content}
                    </div>
                    <span className="text-xs text-slate-400 mt-1 px-1">
                      {post.user.id !== userId && `${post.user.name} · `}
                      {format(new Date(post.createdAt), "HH:mm", { locale: he })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="input flex-1"
              placeholder="כתוב הודעה..."
            />
            <button type="submit" disabled={loading || !newMessage.trim()} className="btn-primary px-4">
              שלח
            </button>
          </form>
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === "photos" && (
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4">📸 גלריית תמונות</h2>

          {/* Upload form */}
          <form onSubmit={uploadPhoto} className="mb-5 bg-slate-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">הוסף תמונה</h3>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="input"
              placeholder="הדבק קישור לתמונה (URL)"
              dir="ltr"
            />
            <input
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              className="input"
              placeholder="כיתוב (אופציונלי)"
            />
            <button type="submit" disabled={loading || !photoUrl.trim()} className="btn-primary">
              הוסף תמונה 📸
            </button>
          </form>

          {photos.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">אין תמונות עדיין</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo.url}
                      alt={photo.caption || "תמונה"}
                      className="w-full h-32 object-cover rounded-xl group-hover:opacity-90 transition-opacity"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/300x200?text=Photo";
                      }}
                    />
                  </a>
                  {photo.caption && (
                    <p className="text-xs text-slate-500 mt-1 text-center">{photo.caption}</p>
                  )}
                  <p className="text-xs text-slate-400 text-center">{photo.user.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Survey Tab */}
      {activeTab === "survey" && (
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-1">סקר אחרי המשחק</h2>
          <p className="text-sm text-slate-400 mb-5">ענה על שתי שאלות קצרות על המשחק</p>

          {!survey ? (
            <p className="text-slate-400 text-sm text-center py-10">
              הסקר לא נפתח עדיין. המנהל יפתח אותו בסיום המשחק.
            </p>
          ) : myVote ? (
            /* ─── הצביע — הצג תוצאות ─── */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <p className="font-semibold text-green-700 text-lg">הצבעתך נקלטה</p>
                <p className="text-sm text-green-600 mt-0.5">
                  {myMvpVote ? `בחרת ב-${myMvpVote.receiver.name} כ-MVP` : "לא בחרת MVP"}
                </p>
              </div>

              {/* תוצאות איזון */}
              {(() => {
                const total = survey.votes.length;
                const balancedCount = survey.votes.filter(v => v.isDraw).length;
                const pct = total > 0 ? Math.round((balancedCount / total) * 100) : 0;
                return (
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <h3 className="font-semibold text-slate-700 mb-3">האם הכוחות היו מאוזנים?</h3>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-green-600 font-medium">כן ({balancedCount})</span>
                      <span className="text-red-500 font-medium">לא ({total - balancedCount})</span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 text-center">{pct}% אמרו שכן · {total} מצביעים</p>
                  </div>
                );
              })()}

              {/* תוצאות MVP */}
              {survey.mvpVotes.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <h3 className="font-semibold text-slate-700 mb-3">שחקן המשחק</h3>
                  {(() => {
                    const counts: Record<string, { name: string | null; count: number }> = {};
                    survey.mvpVotes.forEach(v => {
                      if (!counts[v.receiver.id]) counts[v.receiver.id] = { name: v.receiver.name, count: 0 };
                      counts[v.receiver.id].count++;
                    });
                    const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
                    return (
                      <div className="space-y-2">
                        {sorted.slice(0, 5).map(([uid, data], idx) => (
                          <div key={uid} className="flex items-center gap-3">
                            <span className={clsx(
                              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                              idx === 0 ? "bg-yellow-100 text-yellow-700" : "bg-slate-100 text-slate-500"
                            )}>
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className={clsx("text-sm font-medium", idx === 0 ? "text-slate-800" : "text-slate-600")}>
                                  {data.name}
                                </span>
                                <span className="text-xs text-slate-400">{data.count} קולות</span>
                              </div>
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={clsx("h-full rounded-full", idx === 0 ? "bg-yellow-400" : "bg-slate-300")}
                                  style={{ width: `${(data.count / survey.mvpVotes.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : survey.isOpen ? (
            /* ─── טופס הצבעה ─── */
            <form onSubmit={submitSurvey} className="space-y-6">

              {/* שאלה 1: האם הכוחות היו מאוזנים? */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">האם הכוחות היו מאוזנים?</h3>
                <p className="text-xs text-slate-400 mb-3">האם שתי הקבוצות היו שקולות זו לזו?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSurveyForm(p => ({ ...p, isBalanced: true }))}
                    className={clsx(
                      "py-4 rounded-2xl border-2 font-semibold text-sm transition-all",
                      surveyForm.isBalanced === true
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-slate-200 text-slate-500 hover:border-green-300"
                    )}
                  >
                    כן, היו מאוזנים
                  </button>
                  <button
                    type="button"
                    onClick={() => setSurveyForm(p => ({ ...p, isBalanced: false }))}
                    className={clsx(
                      "py-4 rounded-2xl border-2 font-semibold text-sm transition-all",
                      surveyForm.isBalanced === false
                        ? "border-red-400 bg-red-50 text-red-600"
                        : "border-slate-200 text-slate-500 hover:border-red-200"
                    )}
                  >
                    לא, לא מאוזנים
                  </button>
                </div>
              </div>

              {/* שאלה 2: MVP */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">מי היה MVP?</h3>
                <p className="text-xs text-slate-400 mb-3">שחקן המשחק — אופציונלי</p>
                <div className="grid grid-cols-2 gap-2">
                  {survey.game.rsvps.map(rsvp => (
                    <button
                      type="button"
                      key={rsvp.user.id}
                      onClick={() => setSurveyForm(p => ({
                        ...p,
                        mvpUserId: p.mvpUserId === rsvp.user.id ? "" : rsvp.user.id,
                      }))}
                      className={clsx(
                        "flex items-center gap-2.5 p-3 rounded-xl border-2 text-right transition-all",
                        surveyForm.mvpUserId === rsvp.user.id
                          ? "border-yellow-400 bg-yellow-50"
                          : "border-slate-200 hover:border-yellow-300"
                      )}
                    >
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                        surveyForm.mvpUserId === rsvp.user.id
                          ? "bg-yellow-400 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}>
                        {rsvp.user.name?.[0] ?? "?"}
                      </div>
                      <span className={clsx(
                        "text-sm font-medium",
                        surveyForm.mvpUserId === rsvp.user.id ? "text-yellow-700" : "text-slate-700"
                      )}>
                        {rsvp.user.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || surveyForm.isBalanced === null}
                className="btn-primary w-full"
              >
                שלח הצבעה
              </button>
            </form>
          ) : (
            <p className="text-slate-400 text-sm text-center py-10">הסקר נסגר</p>
          )}
        </div>
      )}
    </div>
  );
}
