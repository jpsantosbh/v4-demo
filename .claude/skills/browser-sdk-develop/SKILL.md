---
name: browser-sdk-develop
description: Use when building apps with @signalwire/signalwire-js, encountering SubscriberClient or Call APIs, seeing observables ending in $, or needing WebRTC calling patterns
---

# SignalWire Browser SDK v4 Development

You are helping develop an application using the SignalWire Browser SDK v4 (`@signalwire/signalwire-js`).

## Quick Reference

### Installation

```bash
npm install @signalwire/signalwire-js
```

Or via CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/@signalwire/signalwire-js/dist/browser.umd.js"></script>
```

### Client Initialization

```javascript
import { SubscriberClient, StaticCredentialProvider } from '@signalwire/signalwire-js';

// Simple token-based auth
const credentials = new StaticCredentialProvider({ token: 'YOUR_SAT_TOKEN' });
const client = new SubscriberClient(credentials);

// Wait for ready state (connected + authenticated)
client.ready$.subscribe(ready => {
  if (ready) console.log('Client ready');
});

// Handle errors
client.errors$.subscribe(error => console.error('Error:', error));
```

### Making Calls

```javascript
const call = await client.dial('/public/room-name', {
  audio: true,
  video: true
});

// Attach media to DOM
call.remoteStream$.subscribe(stream => {
  document.getElementById('remoteVideo').srcObject = stream;
});

call.localStream$.subscribe(stream => {
  document.getElementById('localVideo').srcObject = stream;
});
```

### Destination URI Formats

| Type | Format | Example |
|------|--------|---------|
| Public room | `/public/<room>` | `/public/lobby` |
| Private call | `/private/<resource>` | `/private/user123` |
| PSTN | `/pstn/<number>` | `/pstn/+15551234567` |
| SIP | `/sip/<uri>` | `/sip/user@domain.com` |

## Core Patterns

### RxJS Observables

All state is exposed as observables (ending with `$`):

```javascript
import { filter } from 'rxjs';

// Subscribe to state changes
call.status$.subscribe(status => {
  console.log('Call status:', status);
  // 'new' | 'trying' | 'ringing' | 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
});

// Filter for specific values
call.status$.pipe(
  filter(s => s === 'connected')
).subscribe(() => {
  showCallUI();
});

// Sync access (current value)
const currentStatus = call.status;
```

### Self Participant Controls

```javascript
const self = call.self;

// Audio
await self.mute();
await self.unmute();
await self.toggleMute();

// Video
await self.muteVideo();
await self.unmuteVideo();
await self.toggleMuteVideo();

// Screen sharing
await self.startScreenShare();
await self.stopScreenShare();

// Observe mute state
self.audioMuted$.subscribe(muted => updateMuteButton(muted));
self.videoMuted$.subscribe(muted => updateVideoButton(muted));
```

### Participants

```javascript
// All participants (reactive)
call.participants$.subscribe(participants => {
  renderParticipantList(participants);
});

// Individual events
call.memberJoined$.subscribe(event => {
  console.log('Joined:', event.member.name);
});

call.memberLeft$.subscribe(event => {
  console.log('Left:', event.member_id);
});

call.memberTalking$.subscribe(event => {
  highlightSpeaker(event.member_id, event.talking);
});
```

### Inbound Calls

```javascript
// Register to receive calls
await client.register();

// Listen for incoming calls
client.session.incomingCalls$.subscribe(calls => {
  const ringing = calls.filter(c => c.status === 'ringing');
  if (ringing.length > 0) {
    showIncomingCallUI(ringing[0]);
  }
});

// Answer or reject
call.answer();  // Note: synchronous
call.reject();  // Note: synchronous
```

### Device Management

```javascript
// Reactive device lists (auto-update when devices change)
client.videoInputDevices$.subscribe(cameras => {
  populateCameraDropdown(cameras);
});

client.audioInputDevices$.subscribe(mics => {
  populateMicDropdown(mics);
});

client.audioOutputDevices$.subscribe(speakers => {
  populateSpeakerDropdown(speakers);
});

// Select devices
client.selectVideoInputDevice(camera);
client.selectAudioInputDevice(mic);
client.selectAudioOutputDevice(speaker);
```

### Layouts

```javascript
// Available layouts
call.layouts$.subscribe(layouts => {
  console.log('Available:', layouts);
});

// Current layout
call.layout$.subscribe(layout => {
  console.log('Current:', layout);
});

// Set layout with positions
await call.setLayout('grid', {});
await call.setLayout('highlight-1-active-4', {
  'participant-id': 'reserved-1'
});
```

### DTMF (Touch Tones)

```javascript
await call.sendDigits('1234#');
```

### Cleanup

```javascript
// End call
await call.hangup();

// Disconnect client
await client.disconnect();
client.destroy();  // Release all resources
```

## Not Yet Implemented

The following APIs exist but throw `UnimplementedError`:

| Method | Alternative |
|--------|-------------|
| `call.startRecording()` | Use SWML or server-side REST API |
| `call.startStreaming()` | Use server-side REST API |
| `call.toggleLock()` | None currently |
| `call.setMeta()` / `call.updateMeta()` | None currently |
| `call.transfer()` | None currently |
| `participant.setMeta()` / `participant.updateMeta()` | None currently |
| `participant.transfer()` | None currently |
| `participant.toggleLowbitrate()` | None currently |
| `call.toggleIncomingVideo()` / `call.toggleIncomingAudio()` | None currently |
| `address.activity$` (presence) | None currently |

These features are planned for future releases.

## Common Issues

1. **"Client not ready"** - Wait for `client.ready$` to emit `true` before calling `dial()`
2. **No video/audio** - Check browser permissions and that media elements have `autoplay` attribute
3. **Call disconnects immediately** - Verify your SAT token is valid and not expired
4. **Observable not updating** - Ensure you're subscribing before the event occurs

## Web Components (Optional)

```html
<script src="@signalwire/web-components/dist/browser.umd.js"></script>

<sw-call-media id="call-media">
  <sw-self-media mirror></sw-self-media>
  <sw-call-controls></sw-call-controls>
  <sw-call-status></sw-call-status>
</sw-call-media>

<script>
const call = await client.dial('/public/room');
document.getElementById('call-media').call = call;
</script>
```

