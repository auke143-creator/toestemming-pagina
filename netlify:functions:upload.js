const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TO_EMAIL = "adwit@hgjb.nl";
const FROM_EMAIL = process.env.FROM_EMAIL || "adwit@hgjb.nl";

const cors = (status, body = {}) => ({
  statusCode: status,
  headers: {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return cors(200);
  if (event.httpMethod !== "POST") return cors(405, { error: "Method Not Allowed" });

  try {
    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
    const { timestamp, location, micLevel, snapshot } = JSON.parse(event.body || "{}");
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(snapshot || "");
    if (!m) return cors(400, { error: "Invalid snapshot" });

    const subject = "Nieuwe toestemming + snapshot";
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
        <h2>Nieuwe inzending</h2>
        <ul>
          <li><b>Tijd</b>: ${new Date(timestamp || Date.now()).toISOString()}</li>
          <li><b>Mic-level</b>: ${typeof micLevel === "number" ? micLevel.toFixed(2) : "n.v.t."}</li>
          <li><b>Locatie</b>: ${
            location ? `${location.latitude}, ${location.longitude} (±${location.accuracy}m)` : "onbekend/weigering"
          }</li>
        </ul>
        <p>Snapshot als PNG-bijlage.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject,
        html,
        attachments: [{ filename: `snapshot-${Date.now()}.png`, content: m[1] }],
      }),
    });

    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    return cors(200, { ok: true });
  } catch (e) {
    console.error(e);
    return cors(500, { error: e.message });
  }
};
