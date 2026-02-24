# Audio-Only Dialer Redesign

## Goal

Transform the v4-demo from a video+audio caller into a focused phone-style audio-only dialer with proper call state management and a polished UI.

## Architecture

Single `index.ejs` file. Two UI states controlled by showing/hiding panels. Tailwind CSS via CDN. No video elements.

## UI States

### Idle (dial panel)

- Centered card: title, color-coded status indicator, destination input, Call button
- Call button disabled until `client.ready$` emits `true`
- Placeholder shows supported formats: `/public/room`, `/pstn/+15551234567`

### Active Call (call panel)

- Same card, dial panel hidden
- Human-readable call status: "Calling...", "Connecting...", "Connected", "Ending call..."
- Live duration timer (MM:SS), starts on `connected`
- Mute toggle + Hang Up button

## Call State Machine

```
[Idle] --dial--> trying/ringing --> connecting --> connected --> [Active]
                                                                    |
[Idle] <--resetUI-- disconnected <-- hangup or remote hangup <-----+
```

## Hangup Handling

- Subscribe to `call.status$` for all state transitions
- On `disconnected`: clear call ref, stop timer, reset UI to idle
- Hang up button calls `call.hangup()` and disables itself to prevent double-clicks
- Handles both local and remote hangup

## Mute

- `call.self.toggleMute()` on button click
- `call.self.audioMuted$` subscription for reactive button state

## Error Handling

- Media permission denied: show error in status, stay idle
- Dial failure: show error, reset to idle
- Client error via `client.errors$`: show in status

## Styling

- Tailwind CDN (existing)
- Green call button, red hang up, neutral/amber mute toggle
- `video: false` on `client.dial()` — no video elements in DOM

## Scope

- Single file change: `views/index.ejs`
- No server changes needed
