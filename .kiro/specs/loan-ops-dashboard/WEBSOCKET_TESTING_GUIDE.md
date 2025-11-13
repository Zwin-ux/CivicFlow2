# WebSocket Integration Testing Guide

## Quick Start Testing

### 1. Start the Application
```bash
npm run dev
```

### 2. Open Dashboard
Navigate to: `http://localhost:3000/loan-ops-dashboard.html`

### 3. Check Connection Status
Look for the status indicator in the top-right header:
- **"Live"** (green) = Connected [OK]
- **"Offline"** (red) = Disconnected [FAIL]

## Testing Scenarios

### Test 1: Initial Connection
**Steps:**
1. Open dashboard
2. Login with valid credentials
3. Observe connection status

**Expected Result:**
- Status changes from "Connecting..." to "Live"
- Green pulsing dot appears
- Console log: "WebSocket connected successfully"

### Test 2: Application Update Event
**Steps:**
1. Open dashboard in Browser Tab 1
2. Open staff portal in Browser Tab 2
3. Update an application in Tab 2
4. Switch back to Tab 1

**Expected Result:**
- Application card highlights with blue animation
- Toast notification: "Application #XXXXXXXX updated"
- Card data refreshes automatically

### Test 3: Application Assignment
**Steps:**
1. Open dashboard with unassigned applications
2. Click "Claim" on an application
3. Observe the response

**Expected Result:**
- Toast notification: "Application claimed successfully"
- Application moves from "Unassigned" to "My Queue"
- Green success toast appears
- Queue view refreshes

### Test 4: SLA Warning
**Steps:**
1. Trigger an SLA warning (application approaching deadline)
2. Observe dashboard

**Expected Result:**
- Toast notification: "[WARN] SLA Warning: Application #XXXXXXXX (Applicant Name) is approaching deadline"
- Orange/yellow warning toast
- SLA badge updates to "At Risk" (yellow)
- Card refreshes with new SLA status

### Test 5: SLA Breach
**Steps:**
1. Trigger an SLA breach (application exceeds deadline)
2. Observe dashboard

**Expected Result:**
- Toast notification: " SLA Breach: Application #XXXXXXXX (Applicant Name) has exceeded deadline!"
- Red error toast
- SLA badge updates to "Breached" (red)
- Card refreshes with breached status

### Test 6: Reconnection Logic
**Steps:**
1. Open dashboard (connected)
2. Stop the backend server
3. Wait 5 seconds
4. Restart the backend server
5. Observe reconnection

**Expected Result:**
- Status changes to "Offline" (red)
- Toast: "Connection lost. Attempting to reconnect..."
- Automatic reconnection attempts with delays: 1s, 2s, 4s, 8s, 16s
- Status changes back to "Live" (green)
- Toast: "Real-time updates reconnected"

### Test 7: Maximum Reconnection Attempts
**Steps:**
1. Open dashboard (connected)
2. Stop the backend server permanently
3. Wait for all reconnection attempts

**Expected Result:**
- 5 reconnection attempts with exponential backoff
- After 5 attempts: Toast "Real-time updates unavailable. Please refresh the page."
- Status remains "Offline"
- No more reconnection attempts

### Test 8: Multiple Tabs
**Steps:**
1. Open dashboard in Tab 1
2. Open dashboard in Tab 2
3. Update an application in Tab 1
4. Observe Tab 2

**Expected Result:**
- Both tabs receive the update
- Both tabs show toast notification
- Both tabs refresh the affected card

### Test 9: Ping/Pong Keep-Alive
**Steps:**
1. Open dashboard
2. Leave it idle for 2 minutes
3. Check connection status

**Expected Result:**
- Connection remains "Live"
- No disconnection
- Console shows ping messages every 25 seconds

### Test 10: Network Interruption
**Steps:**
1. Open dashboard (connected)
2. Disable network (airplane mode or disconnect WiFi)
3. Wait 5 seconds
4. Re-enable network

**Expected Result:**
- Status changes to "Offline"
- Automatic reconnection when network returns
- Status changes back to "Live"
- Toast: "Real-time updates reconnected"

## Browser Console Testing

### Check Connection State
```javascript
// Open browser console (F12)

// Check WebSocket connection
DashboardState.wsConnection.readyState
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED

// Check reconnect attempts
DashboardState.wsReconnectAttempts
// Should be 0 when connected

// Check user data
DashboardState.user
// Should show user object with id, username, etc.

// Check current view
DashboardState.currentView
// 'pipeline', 'queue', or 'sla'
```

### Manually Send Test Message
```javascript
// Send a ping
DashboardState.wsConnection.send(JSON.stringify({ type: 'ping' }))

// Subscribe to specific events
DashboardState.wsConnection.send(JSON.stringify({
  type: 'subscribe',
  events: ['application.updated', 'sla.warning']
}))
```

### Monitor WebSocket Messages
```javascript
// Add message listener
DashboardState.wsConnection.addEventListener('message', (event) => {
  console.log('WebSocket message:', JSON.parse(event.data));
});
```

## Backend Testing

### Trigger Events Manually

#### Application Update Event
```typescript
// In any service file
import websocketService from './websocketService';

websocketService.broadcast({
  type: 'application.updated',
  data: {
    id: 'application-id',
    status: 'UNDER_REVIEW',
    slaStatus: 'AT_RISK'
  },
  timestamp: new Date()
});
```

#### Assignment Event
```typescript
websocketService.sendToUser('user-id', {
  type: 'application.assigned',
  data: {
    applicationId: 'app-id',
    assignedTo: 'user-id',
    assignedToName: 'John Doe'
  },
  timestamp: new Date()
});
```

#### SLA Warning Event
```typescript
websocketService.broadcast({
  type: 'sla.warning',
  data: {
    id: 'app-id',
    applicantName: 'Jane Smith',
    slaStatus: 'AT_RISK',
    slaDeadline: new Date()
  },
  timestamp: new Date()
});
```

#### SLA Breach Event
```typescript
websocketService.broadcast({
  type: 'sla.breached',
  data: {
    id: 'app-id',
    applicantName: 'Jane Smith',
    slaStatus: 'BREACHED',
    slaDeadline: new Date()
  },
  timestamp: new Date()
});
```

## Performance Testing

### Load Test
1. Open 10 browser tabs with dashboard
2. Verify all tabs connect successfully
3. Trigger an update event
4. Verify all tabs receive the update

**Expected Result:**
- All tabs show "Live" status
- All tabs receive events
- No performance degradation

### Stress Test
1. Open dashboard
2. Trigger 100 rapid update events
3. Observe dashboard behavior

**Expected Result:**
- Dashboard remains responsive
- All events processed
- No memory leaks
- No UI freezing

## Troubleshooting

### Connection Won't Establish
**Check:**
- Backend server is running
- WebSocket endpoint is accessible: `ws://localhost:3000/api/dashboard/stream`
- User is authenticated (token in localStorage)
- Browser console for errors

### Events Not Received
**Check:**
- Connection status is "Live"
- Backend is emitting events correctly
- Event type matches expected types
- User has permission to receive events

### Reconnection Not Working
**Check:**
- Maximum attempts not exceeded (5)
- Backend server is accessible
- Network connection is stable
- Browser console for reconnection logs

### Performance Issues
**Check:**
- Number of concurrent connections
- Event frequency
- Browser memory usage
- Network latency

## Success Criteria

[OK] **Connection**
- Establishes automatically on dashboard load
- Shows "Live" status when connected
- Includes userId in connection URL

[OK] **Events**
- Receives all event types
- Updates UI appropriately
- Shows toast notifications

[OK] **Reconnection**
- Attempts reconnection on disconnect
- Uses exponential backoff
- Maximum 5 attempts
- Shows appropriate notifications

[OK] **Performance**
- Handles 1000+ concurrent connections
- Processes events without lag
- No memory leaks
- Smooth animations

[OK] **User Experience**
- Clear connection status
- Non-intrusive notifications
- Automatic recovery
- Visual feedback on updates

## Additional Resources

- **WebSocket API Docs**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Backend WebSocket Service**: `src/services/websocketService.ts`
- **Frontend WebSocket Manager**: `public/js/loan-ops-dashboard.js`
- **Event Types**: See design document for complete list
