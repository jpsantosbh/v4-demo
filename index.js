require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3002;

const { SIGNALWIRE_SPACE, SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN } =
  process.env;
const DEFAULT_DESTINATION = process.env.DEFAULT_DESTINATION || "/public/go-to-conference";
const FROM_NUMBER = process.env.FROM_NUMBER;

app.use(express.json());

app.set("view engine", "ejs");

async function getSubscriberToken() {
  const url = `https://${SIGNALWIRE_SPACE}/api/fabric/subscribers/tokens`;
  const credentials = Buffer.from(
    `${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`
  ).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({ reference: "v4-demo-user" }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create subscriber token: ${res.status} ${text}`);
  }

  return res.json();
}

app.get("/", async (req, res) => {
  try {
    const tokenData = await getSubscriberToken();
    res.render("index", { token: tokenData.token, defaultDestination: DEFAULT_DESTINATION });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to obtain subscriber token");
  }
});

app.post("/conference", (req, res) => {
  const isParticipant = req.query.participant !== undefined;
  const conferenceParams = { name: "demo_conference" };
  if (!isParticipant) {
    conferenceParams.end_on_exit = true;
  }

  res.json({
    version: "1.0.0",
    sections: {
      main: [
        {
          "answer": {}
        },
        {
          "play": {
            "url": "say:Joining conference now."
          }
        },
        {
          join_conference: conferenceParams,
        },
      ],
    },
  });
});

function callingApiHeaders() {
  const credentials = Buffer.from(
    `${SIGNALWIRE_PROJECT_ID}:${SIGNALWIRE_API_TOKEN}`
  ).toString("base64");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${credentials}`,
  };
}

app.post("/invite", async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: "Missing 'to'" });
  }

  const protocol = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("host");
  const conferenceUrl = `${protocol}://${host}/conference?participant`;

  try {
    const response = await fetch(
      `https://${SIGNALWIRE_SPACE}/api/calling/calls`,
      {
        method: "POST",
        headers: callingApiHeaders(),
        body: JSON.stringify({
          command: "dial",
          params: {
            from: FROM_NUMBER,
            to,
            caller_id: FROM_NUMBER,
            url: conferenceUrl,
          },
        }),
      }
    );

    const data = await response.json();
    console.log("Dial response:", JSON.stringify(data, null, 2));
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json({ callId: data.id, status: data.status });
  } catch (err) {
    console.error("Invite failed:", err);
    res.status(500).json({ error: "Failed to place outbound call" });
  }
});

app.post("/hangup-invite", async (req, res) => {
  const { callId } = req.body;
  if (!callId) {
    return res.status(400).json({ error: "Missing 'callId'" });
  }

  console.log("Hanging up call:", callId);
  try {
    const response = await fetch(
      `https://${SIGNALWIRE_SPACE}/api/calling/calls`,
      {
        method: "POST",
        headers: callingApiHeaders(),
        body: JSON.stringify({
          id: callId,
          command: "calling.end",
          params: {
            reason: "hangup",
          },
        }),
      }
    );

    const data = await response.json();
    console.log("Hangup response:", response.status, JSON.stringify(data, null, 2));
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json({ status: data.status });
  } catch (err) {
    console.error("Hangup invite failed:", err);
    res.status(500).json({ error: "Failed to hang up invited call" });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
