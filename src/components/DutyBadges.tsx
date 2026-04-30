"use client";

// Read-only display of duty assignments (for players in game card)
type Duty = {
  type: string;
  user: { id: string; name: string | null };
};

type Props = {
  duties: Duty[];
  currentUserId?: string;
};

export const DUTY_CONFIG = {
  laundry: { label: "כביסת חולצות", emoji: "👕", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  field_payment: { label: "תשלום מגרש", emoji: "💵", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export default function DutyBadges({ duties, currentUserId }: Props) {
  if (duties.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {duties.map((duty) => {
        const cfg = DUTY_CONFIG[duty.type as keyof typeof DUTY_CONFIG];
        if (!cfg) return null;
        const isMe = duty.user.id === currentUserId;
        return (
          <div
            key={duty.type}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium ${cfg.bg} ${cfg.text} ${cfg.border} ${isMe ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            <span>{cfg.emoji}</span>
            <span>{cfg.label}:</span>
            <span className="font-bold">{duty.user.name}</span>
            {isMe && <span className="text-xs opacity-75">(אתה!)</span>}
          </div>
        );
      })}
    </div>
  );
}
