import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function Home() {
  const [cards, setCards] = useState([]);
  const [subscribed, setSubscribed] = useState(false);
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [dueDay, setDueDay] = useState(5);
  const [remindDaysBefore, setRemindDaysBefore] = useState(3);

  useEffect(() => {
    fetch("/api/save-subscription")
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setSubscribed(!!data.subscription);
      });
  }, []);

  async function enableNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("Push notifications are not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("Notification permission was denied.");
      return;
    }
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const keyRes = await fetch("/api/vapid-public-key");
    const { publicKey } = await keyRes.json();
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch("/api/save-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub }),
    });
    setSubscribed(true);
    setStatus("Notifications enabled.");
  }

  async function addCard(e) {
    e.preventDefault();
    if (!name || !dueDay) return;
    const next = [...cards, { id: Date.now(), name, dueDay: Number(dueDay), remindDaysBefore: Number(remindDaysBefore) }];
    setCards(next);
    await fetch("/api/save-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards: next }),
    });
    setName("");
    setDueDay(5);
    setRemindDaysBefore(3);
  }

  async function removeCard(id) {
    const next = cards.filter((c) => c.id !== id);
    setCards(next);
    await fetch("/api/save-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards: next }),
    });
  }

  async function sendTest() {
    setStatus("Sending test notification...");
    const res = await fetch("/api/test-push", { method: "POST" });
    const data = await res.json();
    setStatus(data.ok ? "Test notification sent — check your device." : "Error: " + data.error);
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 20, fontFamily: "-apple-system,sans-serif" }}>
      <h1>CardFlow Notify</h1>
      <p style={{ color: "#555" }}>Get a push notification a few days before each credit card bill is due.</p>

      <div style={{ background: "#f5f5f7", padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <button onClick={enableNotifications} disabled={subscribed} style={btnStyle}>
          {subscribed ? "Notifications Enabled ✓" : "Enable Notifications"}
        </button>
        {subscribed && (
          <button onClick={sendTest} style={{ ...btnStyle, marginLeft: 10, background: "#e5e7eb", color: "#111" }}>
            Send Test Notification
          </button>
        )}
        {status && <p style={{ fontSize: 13, color: "#555", marginTop: 10 }}>{status}</p>}
      </div>

      <h2>Add a card</h2>
      <form onSubmit={addCard} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        <input placeholder="Card name (e.g. HDFC PIXEL)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        <input type="number" min="1" max="31" placeholder="Due day" value={dueDay} onChange={(e) => setDueDay(e.target.value)} style={{ ...inputStyle, width: 90 }} />
        <input type="number" min="0" max="15" placeholder="Remind (days before)" value={remindDaysBefore} onChange={(e) => setRemindDaysBefore(e.target.value)} style={{ ...inputStyle, width: 150 }} />
        <button type="submit" style={btnStyle}>Add</button>
      </form>

      <h2>Your cards</h2>
      {cards.length === 0 && <p style={{ color: "#888" }}>No cards added yet.</p>}
      {cards.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid #eee", borderRadius: 10, marginBottom: 8 }}>
          <div>
            <strong>{c.name}</strong>
            <div style={{ fontSize: 12, color: "#666" }}>
              Due on the {c.dueDay}th · Reminder {c.remindDaysBefore} day(s) before
            </div>
          </div>
          <button onClick={() => removeCard(c.id)} style={{ ...btnStyle, background: "#fee2e2", color: "#991b1b" }}>
            Delete
          </button>
        </div>
      ))}

      <p style={{ fontSize: 12, color: "#888", marginTop: 30 }}>
        A background job checks all cards once a day and sends a notification when a reminder is due.
        Keep this tab's notification permission granted and avoid clearing site data, or you'll need to
        tap &quot;Enable Notifications&quot; again.
      </p>
    </div>
  );
}

const btnStyle = {
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "10px 16px",
  cursor: "pointer",
  fontSize: 14,
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  flex: 1,
  minWidth: 120,
};
