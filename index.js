require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3002;

const { SIGNALWIRE_SPACE, SIGNALWIRE_PROJECT_ID, SIGNALWIRE_API_TOKEN } =
  process.env;

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
    res.render("index", { token: tokenData.token });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to obtain subscriber token");
  }
});

app.post("/conference", (req, res) => {
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
          join_conference: {
            name: "demo_conference",
          },
        },
      ],
    },
  });
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
