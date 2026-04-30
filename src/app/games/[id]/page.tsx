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
  isDraw: boolean;
  winnerTeamId: string | null;
  votes: Array<{ userId: string; winnerTeamId: string | null; isDraw: boolean; enjoyment: number }>;
  mvpVotes: Array<{ voterId: string; receiver: { id: string; name: string | null; image: string | null } }>;
  game: {
    teams: Array<{
      id: string;
      name: string;
      color: string;
      players: Array<{ user: { id: string; name: string | null } }>;
    }>;
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
  const [surveyForm, setSurveyForm] = useState({ winnerTeamId: "", isDraw: false, enjoyment: 4, mvpUserId: "" });
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
    if (!surveyForm.isDraw && !surveyForm.winnerTeamId) {
      toast.error("בחר קבוצה מנצחת או תיקו");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/games/${id}/survey`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(surveyForm),
    });
    if (res.ok) {
      toast.success("הצבעתך נקלטה! תודה 🙏");
      fetchSurvey();
    } else {
      toast.error("שגיאה");
    }
    setLoading(false);
  }

  const myVote = survey?.votes.find((v) => v.userId === userId);
  const tabs = [
    { id: "chat", label: `💬 צ'אט`, count: posts.length },
    { id: "photos", label: "📸 תמונות", count: photos.length },
    { id: "survey", label: "🗳️ סקר", count: null, highlight: survey?.isOpen && !myVote },
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
          <h2 className="font-bold text-slate-800 mb-4">🗳️ סקר אחרי המשחק</h2>

          {!survey ? (
            <p className="text-slate-400 text-sm text-center py-8">
              הסקר לא נפתח עדיין. המנהל יפתח אותו בסיום המשחק.
            </p>
          ) : myVote ? (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="font-semibold text-green-700">הצבעתך נקלטה! תודה</p>
                <div className="flex justify-center gap-1 mt-2">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={n <= myVote.enjoyment ? "text-yellow-400" : "text-slate-200"}>⭐</span>
                  ))}
                </div>
              </div>

              {/* Results */}
              {!survey.isOpen && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h3 className="font-bold text-slate-700 mb-3">תוצאות</h3>
                  {survey.isDraw ? (
                    <p className="text-2xl text-center">🤝 תיקו!</p>
                  ) : survey.winnerTeamId ? (
                    <p className="text-xl text-center font-bold">
                      🏆 {survey.game.teams.find(t => t.id === survey.winnerTeamId)?.name} ניצחה!
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm">עדיין לא הוכרע</p>
                  )}

                  {/* MVP Results */}
                  {survey.mvpVotes.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-slate-600 mb-2">⭐ שחקן המשחק</h4>
                      {(() => {
                        const counts: Record<string, { name: string | null; count: number }> = {};
                        survey.mvpVotes.forEach(v => {
                          if (!counts[v.receiver.id]) counts[v.receiver.id] = { name: v.receiver.name, count: 0 };
                          counts[v.receiver.id].count++;
                        });
                        const sorted = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
                        return sorted.slice(0, 3).map(([uid, data]) => (
                          <div key={uid} className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-700">
                              {data.name?.[0]}
                            </div>
                            <span className="text-sm text-slate-700">{data.name}</span>
                            <span className="text-xs text-slate-400">{data.count} קולות</span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : survey.isOpen ? (
            <form onSubmit={submitSurvey} className="space-y-5">
              {/* Winner */}
              <div>
                <h3 className="font-medium text-slate-700 mb-3">מי ניצחה?</h3>
                <div className="space-y-2">
                  {survey.game.teams.map((team) => (
                    <label key={team.id} className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-green-300">
                      <input
                        type="radio"
                        name="winner"
                        value={team.id}
                        checked={!surveyForm.isDraw && surveyForm.winnerTeamId === team.id}
                        onChange={() => setSurveyForm(p => ({ ...p, winnerTeamId: team.id, isDraw: false }))}
                        className="accent-green-500"
                      />
                      <span className="font-medium">{team.name}</span>
                      <span className="text-xs text-slate-400">({team.players.length} שחקנים)</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all hover:border-slate-300">
                    <input
                      type="radio"
                      name="winner"
                      checked={surveyForm.isDraw}
                      onChange={() => setSurveyForm(p => ({ ...p, isDraw: true, winnerTeamId: "" }))}
                      className="accent-slate-500"
                    />
                    <span className="font-medium">🤝 תיקו</span>
                  </label>
                </div>
              </div>

              {/* MVP */}
              <div>
                <h3 className="font-medium text-slate-700 mb-3">⭐ שחקן המשחק</h3>
                <div className="grid grid-cols-2 gap-2">
                  {survey.game.teams.flatMap(t => t.players).map(p => (
                    <label
                      key={p.user.id}
                      className={clsx(
                        "flex items-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all",
                        surveyForm.mvpUserId === p.user.id
                          ? "border-yellow-400 bg-yellow-50"
                          : "border-slate-200 hover:border-yellow-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="mvp"
                        value={p.user.id}
                        checked={surveyForm.mvpUserId === p.user.id}
                        onChange={() => setSurveyForm(prev => ({ ...prev, mvpUserId: p.user.id }))}
                        className="accent-yellow-500"
                      />
                      <span className="text-sm font-medium">{p.user.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Enjoyment */}
              <div>
                <h3 className="font-medium text-slate-700 mb-3">כמה נהנית? ({surveyForm.enjoyment}/5)</h3>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSurveyForm(p => ({ ...p, enjoyment: n }))}
                      className={clsx(
                        "flex-1 py-3 rounded-xl text-lg transition-all",
                        n <= surveyForm.enjoyment ? "bg-yellow-100 text-yellow-600" : "bg-slate-100 text-slate-300"
                      )}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                שלח הצבעה 🗳️
              </button>
            </form>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">הסקר נסגר</p>
          )}
        </div>
      )}
    </div>
  );
}
