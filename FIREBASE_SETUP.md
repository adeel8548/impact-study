# Firebase Chat & Notifications Setup

## Installation

```bash
npm install firebase
```

## Configuration

Firebase is already configured with your project credentials:
- Project ID: `school-web-system`
- API Key: Pre-configured
- Messaging Sender ID: `761240561042`

## Features Implemented

### 1. Real-time Chat Notifications
- Messages trigger notifications with sound
- Two different tone beeps for notification
- Notification only plays once

### 2. Service Worker
- Background message handling
- Notification persistence
- Click handling to open chat window

### 3. Foreground Notifications
- Toast notifications for messages
- Sound alerts
- Automatic notification permission request

## Usage

The chat system automatically:
1. Requests notification permission
2. Registers the service worker
3. Listens for incoming messages
4. Plays sound notification
5. Shows toast/browser notification

## How It Works

### When Message Arrives (App Open):
- `useChatNotifications` hook detects message
- Sound plays (two beeps: 800Hz then 1000Hz)
- Toast notification shows
- Message appears in chat

### When Message Arrives (App Closed):
- Service worker handles message
- Browser notification shows
- Sound plays automatically
- Click notification to open app

## Sound Details

**Notification Sound:**
- Type: Sine wave
- First Beep: 800 Hz, 200ms
- Second Beep: 1000 Hz, 200ms (250ms delay)
- Volume: 30% (safe for all users)

## Browser Requirements

- Modern browser with Service Worker support
- Chrome, Firefox, Edge, Safari (latest versions)
- User must grant notification permission
