"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Send, Smile, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createIdeaMessage,
  updateIdeaNote,
  updateIdeaMessage,
  deleteIdeaMessage,
} from "@/actions/ideas";
import { EMOJI_CATEGORIES_DEDUPED, expandEmojiShortcodes } from "@/lib/emoji";
import { cn } from "@/lib/utils";

export interface IdeaMessage {
  id: string;
  body: string;
  createdAt: Date | string;
  user: { id: string; name: string };
}

interface IdeaChatPanelProps {
  ideaId: string;
  note: string | null;
  messages: IdeaMessage[];
  currentUserId: string;
  currentUserName: string;
}

function formatTime(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("hu-HU", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IdeaChatPanel({
  ideaId,
  note,
  messages,
  currentUserId,
  currentUserName,
}: IdeaChatPanelProps) {
  const [localNote, setLocalNote] = useState(note ?? "");
  const [localMessages, setLocalMessages] = useState(messages);
  const [draft, setDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef<HTMLInputElement>(null);

  const messagesFingerprint = useMemo(
    () => messages.map((m) => `${m.id}:${m.body}`).join("|"),
    [messages]
  );

  useEffect(() => {
    setLocalNote(note ?? "");
  }, [note]);

  useEffect(() => {
    setLocalMessages((prev) => {
      const serverIds = new Set(messages.map((m) => m.id));
      const pending = prev.filter((m) => m.id.startsWith("opt-") || !serverIds.has(m.id));
      return [...pending, ...messages].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);
    });
  }, [messagesFingerprint, messages]);

  useEffect(() => {
    if (chatOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, chatOpen]);

  function handleNoteChange(value: string) {
    setLocalNote(value);
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    noteSaveTimer.current = setTimeout(() => {
      const previous = note ?? "";
      updateIdeaNote({ ideaId, note: value }).then((result) => {
        if (!result.success) {
          setLocalNote(previous);
          toast.error(result.error);
        }
      });
    }, 400);
  }

  function insertEmoji(emoji: string) {
    setDraft((prev) => prev + emoji);
    draftRef.current?.focus();
  }

  function cancelEdit() {
    setEditingId(null);
    setEditOriginal("");
    setDraft("");
  }

  function startEdit(msg: IdeaMessage) {
    setChatOpen(true);
    setEditingId(msg.id);
    setEditOriginal(msg.body);
    setDraft(msg.body);
    setEmojiOpen(false);
    queueMicrotask(() => {
      const el = draftRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  function handleSubmit() {
    const body = expandEmojiShortcodes(draft).trim();

    if (editingId) {
      if (!body) {
        cancelEdit();
        return;
      }
      if (body === editOriginal) {
        cancelEdit();
        return;
      }

      const messageId = editingId;
      const previous = localMessages;
      setLocalMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body } : m)));
      cancelEdit();

      updateIdeaMessage({ id: messageId, body }).then((result) => {
        if (!result.success) {
          setLocalMessages(previous);
          toast.error(result.error);
        }
      });
      return;
    }

    if (!body) return;

    const optimistic = {
      id: `opt-${crypto.randomUUID()}`,
      body,
      createdAt: new Date().toISOString(),
      user: { id: currentUserId, name: currentUserName },
    };

    setLocalMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setEmojiOpen(false);

    createIdeaMessage({ ideaId, body }).then((result) => {
      if (!result.success) {
        setLocalMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
        toast.error(result.error);
        return;
      }
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id
            ? { ...m, id: result.data.id, createdAt: result.data.createdAt }
            : m
        )
      );
    });
  }

  function handleDelete(messageId: string) {
    if (editingId === messageId) cancelEdit();

    const previous = localMessages;
    setLocalMessages((prev) => prev.filter((m) => m.id !== messageId));

    deleteIdeaMessage(messageId).then((result) => {
      if (!result.success) {
        setLocalMessages(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Megjegyzés</label>
        <textarea
          value={localNote}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Rövid összefoglaló, fontos infók…"
          rows={2}
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[60px] w-full resize-y rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full text-sm"
        onClick={() => setChatOpen((v) => !v)}
      >
        {chatOpen ? "Beszélgetés elrejtése" : `Ötletelés (${localMessages.length})`}
      </Button>

      {chatOpen && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div ref={scrollRef} className="max-h-52 space-y-2.5 overflow-y-auto pr-1">
            {localMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Még nincs üzenet. Kezdj el ötletelni!</p>
            ) : (
              localMessages.map((msg) => {
                const isOwn = msg.user.id === currentUserId;
                const isBeingEdited = editingId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={cn("group flex w-full flex-col gap-0.5", isOwn ? "items-end" : "items-start")}
                  >
                    <span className="text-xs text-muted-foreground">
                      {msg.user.name} · {formatTime(msg.createdAt)}
                    </span>

                    <div
                      className={cn(
                        "flex w-full items-center gap-1",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      {isOwn && !msg.id.startsWith("opt-") && (
                        <div
                          className={cn(
                            "flex shrink-0 transition-opacity",
                            isBeingEdited ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => startEdit(msg)}
                            className="rounded p-1 text-muted-foreground hover:text-foreground"
                            title="Szerkesztés"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            className="rounded p-1 text-muted-foreground hover:text-destructive"
                            title="Törlés"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      <div
                        className={cn(
                          "w-fit max-w-[60%] rounded-lg px-3 py-1.5 text-base break-words",
                          isOwn ? "bg-primary text-primary-foreground" : "border bg-card",
                          isBeingEdited && "ring-2 ring-ring ring-offset-1"
                        )}
                      >
                        {msg.body}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {emojiOpen && (
            <div className="max-h-40 overflow-y-auto rounded-md border bg-card p-2.5">
              {EMOJI_CATEGORIES_DEDUPED.map((category) => (
                <div key={category.label} className="mb-2.5 last:mb-0">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{category.label}</p>
                  <div className="flex flex-wrap gap-0.5">
                    {category.emojis.map((emoji, index) => (
                      <button
                        key={`${category.label}-${index}`}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="rounded px-1.5 py-0.5 text-lg leading-none hover:bg-accent"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0"
              onClick={() => setEmojiOpen((v) => !v)}
              title="Emoji"
            >
              <Smile className="h-4 w-4" />
            </Button>
            <Input
              ref={draftRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Írj egy üzenetet…"
              className="h-9 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === "Escape" && editingId) {
                  e.preventDefault();
                  cancelEdit();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleSubmit}
              disabled={!editingId && !draft.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
