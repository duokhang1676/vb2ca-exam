"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

export function ExamTimer({
  endsAt,
  serverNow,
  onExpire,
}: {
  endsAt: number;
  serverNow: number;
  onExpire: () => void;
}) {
  const [offset] = useState(() => Date.now() - serverNow);
  const [remaining, setRemaining] = useState(endsAt - (Date.now() - offset));
  const expiredRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const next = endsAt - (Date.now() - offset);
      setRemaining(next);
      if (next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, offset, onExpire]);

  const safe = Math.max(0, remaining);
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const label = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const urgent = safe <= 10 * 60 * 1000;

  return (
    <Badge variant={urgent ? "destructive" : "secondary"} className="h-7 px-3 font-mono text-sm">
      Còn {label}
    </Badge>
  );
}
