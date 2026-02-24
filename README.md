# SignalWire v4 Demo

A browser-based audio dialer using the SignalWire JS SDK v4 with a SWML conference endpoint and the ability to invite external phone numbers into the conference.

## Prerequisites

- Node.js
- A [SignalWire](https://signalwire.com) space

## SignalWire Setup

1. **Get API credentials** -- In your SignalWire dashboard, grab your **Space Name**, **Project ID**, and **API Token**.

2. **Buy a phone number** -- Purchase a phone number from your SignalWire dashboard. This will be used as the `FROM_NUMBER` (caller ID) when inviting external participants.

3. **Create a Fabric Resource** -- Create a SWML Resource in your SignalWire space and point its SWML handler at your deployed `/conference` endpoint (e.g. `https://your-domain.com/conference`). This is the resource the browser client dials into.

## Installation

```
cp .env.example .env
# Fill in your credentials in .env
npm install
npm start
```

## How It Works

- The browser client connects via the SignalWire JS SDK and dials a Fabric resource that joins a SWML conference.
- The first time a token is requested, a corresponding SignalWire Subscriber is created.
- While in a call, you can invite an external phone number into the same conference. The app originates an outbound call via the SignalWire Calling API, pointing it at the `/conference` SWML endpoint.
- Invited participants can be hung up independently without ending the conference.
