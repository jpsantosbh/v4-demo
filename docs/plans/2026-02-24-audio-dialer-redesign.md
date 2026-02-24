# Audio-Only Dialer Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the v4-demo into a phone-style audio-only dialer with proper call state management, hangup handling, mute toggle, and duration timer.

**Architecture:** Single `index.ejs` file with two panel states (idle/active call) toggled via JS. All state driven by SignalWire SDK observables (`status$`, `audioMuted$`). No video elements.

**Tech Stack:** EJS template, Tailwind CSS (CDN), SignalWire Browser SDK v4 (`@signalwire/js@4.0.0-beta.0`)

---

### Task 1: Replace HTML structure with idle/active call panels

**Files:**
- Modify: `views/index.ejs:1-167` (full rewrite of template)

**Step 1: Rewrite the HTML body**

Replace the entire `<body>` content with two panels inside the card:

```html
<body class="flex items-center justify-center min-h-screen bg-gray-100">
  <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md space-y-6">
    <h1 class="text-2xl font-bold text-gray-800 text-center">SignalWire v4 Demo</h1>

    <div id="status" class="text-center text-sm text-gray-500">Connecting client…</div>

    <!-- Idle: dial panel -->
    <div id="dial-panel" class="space-y-3">
      <input
        id="destination"
        type="text"
        placeholder="/public/room or /pstn/+15551234567"
        class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        id="callBtn"
        disabled
        class="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
      >Call</button>
    </div>

    <!-- Active: call panel (hidden by default) -->
    <div id="call-panel" class="space-y-4 hidden">
      <div class="text-center">
        <p id="call-dest" class="text-lg font-medium text-gray-700"></p>
        <p id="call-status" class="text-sm text-gray-500">Calling…</p>
        <p id="call-duration" class="text-3xl font-mono text-gray-800 mt-2">0:00</p>
      </div>

      <div class="flex gap-3">
        <button
          id="muteBtn"
          class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg transition"
        >Mute</button>
        <button
          id="hangupBtn"
          class="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition"
        >Hang Up</button>
      </div>
    </div>
  </div>
```

No video elements at all.

**Step 2: Verify HTML renders**

Run: `npm start` and open `http://localhost:3002`
Expected: See the card with destination input and Call button. Call panel should be hidden.

**Step 3: Commit**

```bash
git add views/index.ejs
git commit -m "refactor: replace HTML with idle/active call panels, remove video"
```

---

### Task 2: Rewrite client initialization and ready/error handling

**Files:**
- Modify: `views/index.ejs` (the `<script>` block)

**Step 1: Write the client init and state management scaffold**

Replace the entire `<script>` block. Start with client setup, element refs, and ready/error handling:

```javascript
window.__SW_TOKEN__ = "<%= token %>";

(async function () {
  const statusEl   = document.getElementById('status');
  const callBtn    = document.getElementById('callBtn');
  const hangupBtn  = document.getElementById('hangupBtn');
  const muteBtn    = document.getElementById('muteBtn');
  const destInput  = document.getElementById('destination');
  const dialPanel  = document.getElementById('dial-panel');
  const callPanel  = document.getElementById('call-panel');
  const callDest   = document.getElementById('call-dest');
  const callStatus = document.getElementById('call-status');
  const callDur    = document.getElementById('call-duration');

  let currentCall = null;
  let durationInterval = null;
  let callStartTime = null;

  // --- Client init ---
  const credentials = new SignalWire.StaticCredentialProvider({
    token: window.__SW_TOKEN__,
  });
  const client = new SignalWire.SignalWire(credentials);

  client.ready$.subscribe((ready) => {
    if (ready) {
      statusEl.textContent = 'Ready — enter a destination and press Call';
      statusEl.className   = 'text-center text-sm text-green-600';
      callBtn.disabled     = false;
    }
  });

  client.errors$.subscribe((err) => {
    console.error('Client error:', err);
    statusEl.textContent = 'Client error — check console';
    statusEl.className   = 'text-center text-sm text-red-600';
  });
```

This is the same init pattern but with the new element refs.

**Step 2: Commit**

```bash
git add views/index.ejs
git commit -m "refactor: rewrite client init with new panel element refs"
```

---

### Task 3: Implement call state machine with proper hangup handling

**Files:**
- Modify: `views/index.ejs` (continuing the `<script>` block)

**Step 1: Add the status-to-label mapping and UI helpers**

```javascript
  const STATUS_LABELS = {
    trying:        'Calling…',
    ringing:       'Ringing…',
    connecting:    'Connecting…',
    connected:     'Connected',
    disconnecting: 'Ending call…',
    disconnected:  'Call ended',
  };

  function showCallPanel(dest) {
    callDest.textContent   = dest;
    callStatus.textContent = 'Calling…';
    callDur.textContent    = '0:00';
    dialPanel.classList.add('hidden');
    callPanel.classList.remove('hidden');
    hangupBtn.disabled = false;
  }

  function resetToIdle() {
    stopDurationTimer();
    callPanel.classList.add('hidden');
    dialPanel.classList.remove('hidden');
    callBtn.disabled   = false;
    hangupBtn.disabled = false;
    currentCall = null;
    statusEl.textContent = 'Ready — enter a destination and press Call';
    statusEl.className   = 'text-center text-sm text-green-600';
  }

  function startDurationTimer() {
    callStartTime = Date.now();
    durationInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      callDur.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function stopDurationTimer() {
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
  }
```

**Step 2: Add the call button handler with status$ subscription**

```javascript
  callBtn.addEventListener('click', async () => {
    const dest = destInput.value.trim();
    if (!dest) return;

    callBtn.disabled = true;
    statusEl.textContent = 'Requesting microphone…';
    statusEl.className   = 'text-center text-sm text-yellow-600';

    // Request mic permission in click handler (user gesture)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (permErr) {
      console.error('Microphone permission denied:', permErr);
      statusEl.textContent = 'Microphone access denied';
      statusEl.className   = 'text-center text-sm text-red-600';
      callBtn.disabled = false;
      return;
    }

    statusEl.textContent = 'Dialling…';

    try {
      currentCall = await client.dial(dest, { audio: true, video: false });
      showCallPanel(dest);

      // Subscribe to call status — this handles ALL transitions including remote hangup
      currentCall.status$.subscribe((s) => {
        callStatus.textContent = STATUS_LABELS[s] || s;

        if (s === 'connected') {
          startDurationTimer();
        }

        if (s === 'disconnected' || s === 'destroyed') {
          resetToIdle();
        }
      });

      // Subscribe to mute state reactively
      currentCall.self.audioMuted$.subscribe((muted) => {
        muteBtn.textContent = muted ? 'Unmute' : 'Mute';
        if (muted) {
          muteBtn.className = 'flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 rounded-lg transition';
        } else {
          muteBtn.className = 'flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg transition';
        }
      });
    } catch (err) {
      console.error('Dial failed:', err);
      statusEl.textContent = 'Dial failed — check console';
      statusEl.className   = 'text-center text-sm text-red-600';
      callBtn.disabled = false;
    }
  });
```

**Step 3: Add hangup and mute handlers**

```javascript
  hangupBtn.addEventListener('click', () => {
    if (currentCall) {
      hangupBtn.disabled = true; // prevent double-click
      currentCall.hangup();
    }
  });

  muteBtn.addEventListener('click', () => {
    if (currentCall) {
      currentCall.self.toggleMute();
    }
  });
})();
```

**Step 4: Test manually**

Run: `npm start`, open browser, make a call, verify:
1. Status transitions show correct labels
2. Duration timer starts on "connected"
3. Click Hang Up → returns to idle cleanly
4. Remote party hangs up → returns to idle cleanly
5. Mute toggles button text and color

**Step 5: Commit**

```bash
git add views/index.ejs
git commit -m "feat: implement call state machine with hangup handling, mute, duration timer"
```

---

### Task 4: Final polish and cleanup

**Files:**
- Modify: `views/index.ejs`

**Step 1: Review the full file end-to-end**

Read the complete file and verify:
- No video elements remain
- No unused variables
- `crypto` proxy is still present (needed by SDK)
- Token injection `<%= token %>` is intact

**Step 2: Test full flow manually**

Run: `npm start`
- Page loads → "Connecting client…" → "Ready"
- Enter destination, click Call → mic permission → "Dialling…" → call panel appears
- Call connects → timer starts, "Connected"
- Toggle mute → button changes to amber "Unmute"
- Hang up → returns to idle
- Repeat: call and have remote party hang up → returns to idle

**Step 3: Commit**

```bash
git add views/index.ejs
git commit -m "chore: final polish on audio dialer"
```
