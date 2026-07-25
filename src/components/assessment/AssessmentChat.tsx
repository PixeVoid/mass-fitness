"use client";

import { useEffect, useRef, useState } from "react";
import {
  ASSESSMENT_DISCLAIMER,
  ASSESSMENT_GREETING,
} from "@/lib/chat/assessmentPrompt";

type Message = { role: "user" | "assistant"; content: string };

const MAX_MESSAGE_CHARS = 800;

/**
 * The anonymous assessment chat plus the lead-capture form beneath it.
 *
 * Kept as one component (rather than two wired through a parent) because the
 * form needs the transcript to fill in `summary` — the same pattern
 * LoginForm.tsx uses for its own tightly-coupled steps.
 */
export default function AssessmentChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: ASSESSMENT_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setInput("");

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);

    // Placeholder the assistant reply streams into.
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        if (res.status === 429) {
          setError("Too many messages — give it a few minutes and try again.");
        } else {
          setError("Something went wrong. Please try again.");
        }
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const delta = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + delta,
          };
          return copy;
        });
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  const hasExchanged = messages.some((m) => m.role === "user");

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="panel flex h-[32rem] w-full flex-col rounded-2xl lg:h-[36rem] lg:flex-[1.3]">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[0.9375rem] leading-relaxed ${
                  m.role === "user"
                    ? "bg-ink text-paper"
                    : "bg-surface-sunk text-ink"
                }`}
              >
                {m.content || (sending && i === messages.length - 1 ? "…" : "")}
              </p>
            </div>
          ))}
          {error && (
            <p className="field-error text-center">{error}</p>
          )}
        </div>

        <form
          onSubmit={sendMessage}
          className="flex items-center gap-2 border-t border-line p-3 sm:p-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
            placeholder="Type your answer…"
            disabled={sending}
            className="field flex-1"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn btn-solid disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>

      <div className="w-full lg:flex-1">
        <LeadForm transcript={messages} ready={hasExchanged} />
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-faint">
          {ASSESSMENT_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

function LeadForm({
  transcript,
  ready,
}: {
  transcript: Message[];
  ready: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const summary =
      note.trim() ||
      transcript
        .filter((m) => m.content.trim())
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Visitor" : "AI"}: ${m.content}`)
        .join("\n");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, summary, company }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many attempts — please try again in a few minutes.");
        } else if (typeof data?.error === "string" && res.status === 400) {
          setError(data.error);
        } else {
          setError("Couldn't send that — please check your details and try again.");
        }
        setStatus("error");
        return;
      }

      setStatus("done");
    } catch {
      setError("Couldn't send that — check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="panel rounded-2xl p-6 sm:p-7">
        <p className="label text-faint">Thanks</p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink">
          Got it — someone from the Mass Fitness team will reach out on{" "}
          {phone} shortly with a personalised plan.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="panel rounded-2xl p-6 sm:p-7">
      <p className="label text-faint">
        {ready ? "Get your full plan" : "Skip the chat"}
      </p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
        Leave your details and a coach will follow up with a plan built
        around what you told the assistant.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="lead-name" className="field-label">
            Name
          </label>
          <input
            id="lead-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="lead-phone" className="field-label">
            Mobile number
          </label>
          <input
            id="lead-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            inputMode="tel"
            placeholder="98765 43210"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="lead-email" className="field-label">
            Email <span className="text-faint">(optional)</span>
          </label>
          <input
            id="lead-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="lead-note" className="field-label">
            What do you want to know?{" "}
            <span className="text-faint">(optional)</span>
          </label>
          <textarea
            id="lead-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Anything specific you'd like the coach to cover"
            className="field resize-none"
          />
        </div>

        {/* Honeypot — real visitors never see this field. */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        {error && <p className="field-error">{error}</p>}

        <button
          type="submit"
          disabled={status === "sending"}
          className="btn btn-solid disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Send my details"}
        </button>
      </div>
    </form>
  );
}
