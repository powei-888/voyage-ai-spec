"use client";

import { GripVertical, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DragEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { moveEventAction } from "../app/actions/itinerary-actions";

export function DraggableEvent({
  tripId,
  dayId,
  eventId,
  targetIndex,
  children
}: {
  tripId: string;
  dayId: string;
  eventId: string;
  targetIndex: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("application/x-voyage-event");
    if (!sourceId || sourceId === eventId) return;
    startTransition(async () => {
      try {
        await moveEventAction(tripId, sourceId, dayId, targetIndex);
        router.refresh();
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "無法移動行程。");
      }
    });
  }

  return (
    <div
      className={`draggable-event ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
    >
      <button
        aria-label="拖曳調整行程順序"
        className="icon-button drag-handle"
        draggable={!pending}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("application/x-voyage-event", eventId);
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
        title="拖曳調整順序"
        type="button"
      >
        {pending ? <LoaderCircle className="spin" size={15} /> : <GripVertical size={16} />}
      </button>
      {children}
    </div>
  );
}
