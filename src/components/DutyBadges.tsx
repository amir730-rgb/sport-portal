"use client";

import { Shirt, Banknote } from "lucide-react";
import { ComponentType } from "react";

type Duty = {
  type: string;
  user: { id: string; name: string | null };
};

type Props = {
  duties: Duty[];
  currentUserId?: string;
};

export const DUTY_CONFIG: Record<string, {
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  bg: string;
  text: string;
  border: string;
}> = {
  laundry: {
    label: "כביסת חולצות",
    Icon: Shirt,
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  field_payment: {
    label: "תשלום מגרש",
    Icon: Banknote,
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
};

export default function DutyBadges({ duties, currentUserId }: Props) {
  if (duties.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {duties.map((duty) => {
        const cfg = DUTY_CONFIG[duty.type];
        if (!cfg) return null;
        const isMe = duty.user.id === currentUserId;
        return (
          <div
            key={duty.type}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${cfg.bg} ${cfg.text} ${cfg.border} ${isMe ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            <cfg.Icon size={13} />
            <span>{cfg.label}:</span>
            <span className="font-bold">{duty.user.name}</span>
            {isMe && <span className="opacity-60">(אתה)</span>}
          </div>
        );
      })}
    </div>
  );
}
