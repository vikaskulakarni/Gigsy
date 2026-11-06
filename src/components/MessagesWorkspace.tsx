"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  body: string;
  sentAt?: string | null;
};

export function MessagesWorkspace() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [peer, setPeer] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [me, setMe] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const [c, u] = await Promise.all([
        fetch("/api/messages/contacts", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);

      const cd = await c.json();
      const ud = await u.json();

      if (!c.ok) throw new Error(cd.message || "Could not load contacts.");

      setContacts(cd.contacts || []);
      setMe(ud.user?.id ?? null);
    } catch (e) {
      console.error("Contact loading failed:", e);
      setError(e instanceof Error ? e.message : "Could not load contacts.");
    }
  }, []);

  const loadMessages = useCallback(async (id: number, silent = false) => {
    try {
      if (!silent) setLoading(true);

      const r = await fetch(`/api/messages?with=${id}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      const d = await r.json();

      if (!r.ok) {
        if (!silent) setError(d.message || "Could not load conversation.");
        return;
      }

      if (Array.isArray(d.messages)) {
        setMessages((previous) => {
          const incoming = d.messages as Message[];

          // Avoid unnecessary updates when nothing has changed.
          if (
            previous.length === incoming.length &&
            previous.every((m, i) =>
              m.id === incoming[i].id &&
              m.body === incoming[i].body
            )
          ) {
            return previous;
          }

          return incoming;
        });

        if (!silent) setError("");
      }
    } catch (e) {
      console.error("Message loading failed:", e);
      if (!silent) setError("Could not load messages. Check your connection.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();

    const params = new URLSearchParams(window.location.search);
    const recipient = Number(params.get("with"));

    if (Number.isSafeInteger(recipient) && recipient > 0) {
      setPeer(recipient);
    }

    const contactTimer = window.setInterval(() => {
      void loadContacts();
    }, 15000);

    return () => window.clearInterval(contactTimer);
  }, [loadContacts]);

  useEffect(() => {
    if (peer === null) {
      setMessages([]);
      return;
    }

    let active = true;
    let inFlight = false;

    setMessages([]);

    const refresh = async (silent: boolean) => {
      if (!active || inFlight) return;

      inFlight = true;

      try {
        await loadMessages(peer, silent);
      } finally {
        inFlight = false;
      }
    };

    void refresh(false);

    const timer = window.setInterval(() => {
      void refresh(true);
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [peer, loadMessages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();

    const text = body.trim();

    if (peer === null || !text || sending) return;

    setSending(true);
    setError("");

    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: peer, body: text }),
      });

      const d = await r.json();

      if (!r.ok || !d.success) {
        setError(d.message || "Message could not be sent.");
        return;
      }

      if (d.message) {
        setMessages((previous) => {
          const exists = previous.some((m) => m.id === d.message.id);
          return exists ? previous : [...previous, d.message];
        });
      }

      setBody("");

      void loadContacts();
      void loadMessages(peer, true);
    } catch (e) {
      console.error("Message send failed:", e);
      setError("Message could not be sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="container inner-page">
      <span className="eyebrow">COMMUNICATION</span>
      <h1>Messages</h1>
      <p className="muted">
        Your conversations are saved in MySQL. New messages refresh automatically.
      </p>

      {error && (
        <p role="alert" style={{ color: "#fb7185" }}>
          {error} <Link href="/login">Sign in</Link>
        </p>
      )}

      <div className="messaging-layout">
        <aside className="messaging-contacts">
          <h3>Conversations</h3>

          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setError("");
                setPeer(Number(c.id));
              }}
              className={peer === Number(c.id) ? "active" : ""}
            >
              {c.name}
              <small>{c.role}</small>
            </button>
          ))}

          {!contacts.length && <p>No previous conversations yet.</p>}

          <label>
            Recipient user ID
            <input
              type="number"
              min="1"
              value={peer ?? ""}
              onChange={(e) => {
                const value = Number(e.target.value);
                setPeer(value > 0 ? value : null);
              }}
              placeholder="e.g. 2"
            />
          </label>
        </aside>

        <section className="messaging-thread">
          {peer !== null ? (
            <>
              <div className="messaging-history">
                {loading && !messages.length && <p>Loading conversation...</p>}

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      Number(m.senderId) === me
                        ? "message-own"
                        : "message-other"
                    }
                  >
                    <p>{m.body}</p>
                    <small>
                      {m.sentAt
                        ? new Date(m.sentAt).toLocaleString()
                        : ""}
                    </small>
                  </div>
                ))}

                {!loading && !messages.length && (
                  <p>No messages in this conversation. Send the first message!</p>
                )}
              </div>

              <form onSubmit={send} className="messaging-compose">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={5000}
                  placeholder="Write a message..."
                  required
                  disabled={sending}
                />

                <button
                  className="button"
                  type="submit"
                  disabled={sending || !body.trim()}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-panel">
              <h2>Select a conversation</h2>
              <p>Choose a contact or enter an existing user ID.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
