"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_DISCLAIMER } from "@/lib/chat/prompt";

/**
 * The assistant (BUILD_PLAN Phase 5 — the UI half).
 *
 * `/api/chat` answers with a plain `text/plain` stream of token deltas rather
 * than SSE, so consuming it is a `for await` over decoded chunks with no
 * parsing on this side. That is the whole reason the route translates the
 * provider's format server-side.
 *
 * Rendered only inside the member area, because the route is members-only.
 */

interface Message {
  role: "user" | "assistant";
  content: string;
}

/** Mirrors the route's own cap, so the browser refuses before the server does. */
const MAX_MESSAGE_CHARS = 2000;

const GENERIC_ERROR = "Something went wrong reaching the assistant. Try again.";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // The scroll-to-top button lives in the same corner. It reads this to sit
  // above the launcher instead of underneath it.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--fab-stack", "3.75rem");
    return () => {
      root.style.removeProperty("--fab-stack");
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  // Pin to the newest message as tokens arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const text = draft.trim();
    if (!text || pending) return;

    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setDraft("");
    setNotice(null);
    setPending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok || !response.body) {
        // The route sends human copy for every rule it enforces, so quota
        // refusals explain themselves rather than reading as a failure.
        const body = await response.json().catch(() => null);
        setNotice(body?.message ?? GENERIC_ERROR);
        setPending(false);
        return;
      }

      // Append an empty assistant turn, then grow it in place as deltas land.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const delta = decoder.decode(value, { stream: true });
        if (!delta) continue;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + delta };
          return next;
        });
      }
    } catch {
      setNotice(GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter breaks the line — the convention everywhere
    // else people type into a chat box.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? "Close the assistant" : "Ask the assistant"}
        className="fixed bottom-5 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-inverse-bg px-5 text-[0.8125rem] font-medium text-inverse-fg shadow-[var(--shadow-soft)] transition-opacity duration-300 hover:opacity-85 sm:bottom-6 sm:right-6"
      >
        <span aria-hidden="true" className="block h-4 w-4">
          <ChatIcon />
        </span>
        {open ? "Close" : "Ask a coach"}
      </button>

      {open && (
        <div
          id="chat-panel"
          role="dialog"
          aria-label="Fitness assistant"
          className="panel fixed bottom-20 right-4 z-40 flex max-h-[min(32rem,calc(100dvh-8rem))] w-[calc(100vw-2rem)] flex-col rounded-3xl shadow-[var(--shadow-soft)] sm:bottom-24 sm:right-6 sm:w-[24rem]"
        >
          {/* Both notices are shown in full before the first message and
              condensed to one line after it. That ordering is the point: the
              consent to have a conversation stored belongs in front of the
              conversation, not buried in a policy page — but on a phone, three
              paragraphs of small print above every reply would push the answer
              off the screen. */}
          <div className="border-b border-line px-5 py-4">
            <p className="label text-faint">Fitness assistant</p>
            {messages.length === 0 ? (
              <>
                <p className="mt-2 text-[0.75rem] leading-relaxed text-faint">
                  {CHAT_DISCLAIMER}
                </p>
                <p className="mt-2 text-[0.75rem] leading-relaxed text-faint">
                  Chats are saved for 12 months so we can support you and
                  improve the assistant. Don&rsquo;t type anything you
                  wouldn&rsquo;t want stored.
                </p>
              </>
            ) : (
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-faint">
                Not medical advice · saved for 12 months
              </p>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
            {messages.length === 0 ? (
              <p className="text-[0.875rem] leading-relaxed text-muted">
                Ask about form, programming, or what to train today.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {messages.map((message, i) => (
                  <li
                    key={i}
                    className={
                      message.role === "user"
                        ? "max-w-[85%] self-end rounded-2xl rounded-br-md bg-inverse-bg px-4 py-2.5 text-[0.875rem] leading-relaxed text-inverse-fg"
                        : "text-[0.875rem] leading-relaxed whitespace-pre-wrap text-ink"
                    }
                  >
                    {message.content ||
                      (pending && i === messages.length - 1 ? "…" : "")}
                  </li>
                ))}
              </ul>
            )}

            {notice && (
              <p role="alert" className="mt-4 text-[0.8125rem] leading-relaxed text-muted">
                {notice}
              </p>
            )}
          </div>

          <div className="border-t border-line p-3">
            <textarea
              ref={inputRef}
              rows={2}
              value={draft}
              maxLength={MAX_MESSAGE_CHARS}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask something…"
              aria-label="Message"
              className="field resize-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={pending || !draft.trim()}
              className="btn btn-solid mt-2 w-full disabled:opacity-50"
            >
              {pending ? "Thinking…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-full w-full"
    >
      <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" />
    </svg>
  );
}
