# Quick Actions UI - Developer Reference

## Overview
The Quick Actions UI provides modal dialogs for common loan officer tasks directly from the dashboard.

## Architecture

### Component Structure
```
QuickActionsModal (JavaScript Object)
├── Modal Display Functions
│   ├── showRequestDocuments(applicationId)
│   ├── showAddNote(applicationId)
│   ├── showStartHuddle(applicationId)
│   └── showLogDecision(applicationId)
├── Form Submission Functions
│   ├── submitRequestDocuments(applicationId)
│   ├── submitAddNote(applicationId)
│   ├── submitStartHuddle(applicationId)
│   └── submitLogDecision(applicationId)
├── Helper Functions
│   ├── formatText(command)
│   ├── insertList(type)
│   ├── addParticipant()
│   ├── removeParticipant(button)
│   ├── showModal(html)
│   ├── handleEscapeKey(e)
│   └── close()
└── Integration Points
    ├── Pipeline View Cards
    ├── Queue View Rows
    └── SLA View Items
```

## Modal Types

### 1. Request Documents Modal

**Purpose**: Request missing documents from applicants

**Form Fields**:
- Document Types (multi-select checkboxes)
  - W9 Form
  - EIN Verification
  - Bank Statement
  - Tax Return
  - Business License
  - Other
- Message to Applicant (textarea)

**Validation**:
- At least one document type must be selected

**API Endpoint**: `POST /api/dashboard/actions/request-documents`

**Request Body**:
```json
{
  "applicationId": "uuid",
  "documentTypes": ["W9", "BANK_STATEMENT"],
  "message": "Please upload the following documents..."
}
```

**Usage**:
```javascript
QuickActionsModal.showRequestDocuments('app-id-123');
```

### 2. Add Note Modal

**Purpose**: Add internal notes to applications

**Form Fields**:
- Note Content (rich text editor)
  - Formatting: Bold, Italic, Underline
  - Lists: Bullet, Numbered

**Validation**:
- Note content cannot be empty

**API Endpoint**: `POST /api/dashboard/actions/add-note`

**Request Body**:
```json
{
  "applicationId": "uuid",
  "note": "Internal note text",
  "isInternal": true
}
```

**Usage**:
```javascript
QuickActionsModal.showAddNote('app-id-456');
```

### 3. Start Teams Huddle Modal

**Purpose**: Create Microsoft Teams meetings for application discussions

**Form Fields**:
- Participant Email Addresses (dynamic list)
  - Add/remove participants
  - Email validation
- Meeting Details (read-only)
  - Start Time: 5 minutes from now
  - Duration: 1 hour
  - Type: Microsoft Teams Meeting

**Validation**:
- At least one participant required
- Valid email format for all participants

**API Endpoint**: `POST /api/dashboard/actions/start-huddle`

**Request Body**:
```json
{
  "applicationId": "uuid",
  "participants": ["user1@example.com", "user2@example.com"]
}
```

**Response**:
```json
{
  "success": true,
  "meetingLink": "https://teams.microsoft.com/...",
  "meetingId": "meeting-id"
}
```

**Usage**:
```javascript
QuickActionsModal.showStartHuddle('app-id-789');
```

### 4. Log Decision Modal

**Purpose**: Record approval/rejection decisions

**Form Fields**:
- Decision Type (select)
  - Approve
  - Reject
  - Defer
- Approved Amount (number, conditional)
  - Only shown for "Approve" decision
  - Optional (defaults to requested amount)
- Justification (textarea, required)
- Override Reason (textarea, conditional)
  - Shown for all decision types

**Validation**:
- Decision type must be selected
- Justification is required

**API Endpoint**: `POST /api/dashboard/actions/log-decision`

**Request Body**:
```json
{
  "applicationId": "uuid",
  "decision": "APPROVED",
  "amount": 50000,
  "justification": "Meets all criteria",
  "overrideReason": "Manual override due to special circumstances"
}
```

**Usage**:
```javascript
QuickActionsModal.showLogDecision('app-id-012');
```

## Integration Points

### Pipeline View
Quick action buttons are added to each application card:

```javascript
<div class="quick-actions">
    <button class="quick-action-btn" onclick="QuickActionsModal.showRequestDocuments('${app.id}')">
        <svg>...</svg>
        Docs
    </button>
    <button class="quick-action-btn" onclick="QuickActionsModal.showAddNote('${app.id}')">
        <svg>...</svg>
        Note
    </button>
    <button class="quick-action-btn" onclick="QuickActionsModal.showStartHuddle('${app.id}')">
        <svg>...</svg>
        Huddle
    </button>
    <button class="quick-action-btn" onclick="QuickActionsModal.showLogDecision('${app.id}')">
        <svg>...</svg>
        Decision
    </button>
</div>
```

### Queue View
Quick action icon buttons are added to the actions column:

```javascript
<button class="btn-action" onclick="QuickActionsModal.showRequestDocuments('${app.id}')" title="Request Documents">
    <svg>...</svg>
</button>
// ... other buttons
```

### SLA View
Quick action buttons are added to SLA item actions:

```javascript
<button class="btn btn-secondary btn-sm" onclick="QuickActionsModal.showRequestDocuments('${app.id}')">
    Request Docs
</button>
// ... other buttons
```

## Modal Behavior

### Opening
1. Modal HTML is generated with application ID
2. HTML is inserted into `#modal-container`
3. CSS class `show` is added after 10ms for animation
4. Event listeners are attached:
   - Click outside to close
   - Escape key to close

### Closing
1. CSS class `show` is removed
2. After 300ms animation, modal HTML is removed
3. Event listeners are cleaned up

### Form Submission
1. Validate form data
2. Disable submit button and show loading state
3. Call API endpoint
4. On success:
   - Show success toast
   - Close modal
   - Refresh dashboard view
5. On error:
   - Show error toast
   - Re-enable submit button

## CSS Classes

### Modal Structure
- `.modal-overlay` - Full-screen overlay with backdrop
- `.modal` - Modal container
- `.modal-header` - Header with title and close button
- `.modal-body` - Content area with form
- `.modal-footer` - Footer with action buttons

### Form Elements
- `.form-group` - Form field container
- `.form-label` - Field label
- `.form-input` - Text input
- `.form-select` - Dropdown select
- `.form-textarea` - Multi-line text input
- `.form-checkbox` - Checkbox with label
- `.form-help` - Help text below field

### Quick Actions
- `.quick-actions` - Container for quick action buttons
- `.quick-action-btn` - Individual quick action button
- `.btn-action` - Icon-only action button

### Rich Text Editor
- `.note-editor` - Editor container
- `.editor-toolbar` - Formatting toolbar
- `.toolbar-btn` - Toolbar button
- `.note-editor-content` - Editable content area

### Participant Management
- `.participant-input-group` - Email input with remove button
- `.participant-email` - Email input field

## Error Handling

### Client-Side Validation
- Empty required fields
- Invalid email formats
- Minimum selection requirements

### API Error Handling
- Network errors
- Server errors (500)
- Validation errors (400)
- Not found errors (404)

### User Feedback
- Toast notifications for success/error
- Button loading states
- Form field error states

## Accessibility

### Keyboard Navigation
- Tab through form fields
- Escape key to close modal
- Enter to submit (in some cases)

### Screen Readers
- Semantic HTML elements
- ARIA labels where needed
- Descriptive button titles

### Visual Indicators
- Focus states on interactive elements
- Loading states on buttons
- Error/success states on forms

## Performance Considerations

### Modal Rendering
- Modals are created on-demand
- Only one modal exists at a time
- Modal HTML is removed after closing

### API Calls
- Debouncing not needed (single action)
- Loading states prevent double-submission
- Errors are caught and handled gracefully

### Dashboard Refresh
- Only current view is refreshed
- Uses existing refresh methods
- Maintains user's position in view

## Future Enhancements

### Potential Improvements
1. **Rich Text Editor**: Replace with robust library (Quill, TinyMCE)
2. **Email Validation**: Use comprehensive validation library
3. **Participant Autocomplete**: Suggest team members from directory
4. **Decision Templates**: Pre-filled justification templates
5. **Document Preview**: Show which documents are already uploaded
6. **Note History**: Display previous notes in modal
7. **Batch Actions**: Select multiple applications for bulk actions
8. **Keyboard Shortcuts**: Quick access to common actions

### Integration Opportunities
1. **Audit Logging**: Track all quick actions
2. **Analytics**: Monitor which actions are used most
3. **Notifications**: Real-time updates when actions complete
4. **Collaboration**: Show who else is viewing/editing
5. **Offline Support**: Queue actions when offline

## Troubleshooting

### Modal Not Opening
- Check console for JavaScript errors
- Verify `#modal-container` exists in HTML
- Ensure QuickActionsModal object is defined

### Form Submission Failing
- Check network tab for API errors
- Verify authentication token is valid
- Check API endpoint is accessible

### Styling Issues
- Verify dashboard.css is loaded
- Check for CSS conflicts
- Inspect element styles in DevTools

### Rich Text Editor Not Working
- Check browser compatibility
- Verify contenteditable is supported
- Test document.execCommand() support

## Testing Checklist

### Functional Tests
- [ ] All modals open correctly
- [ ] All forms validate properly
- [ ] All API calls succeed
- [ ] Success notifications display
- [ ] Error notifications display
- [ ] Dashboard refreshes after actions

### UI Tests
- [ ] Modals are centered on screen
- [ ] Animations are smooth
- [ ] Buttons have hover states
- [ ] Forms are properly styled
- [ ] Responsive on mobile devices

### Integration Tests
- [ ] Quick actions work from pipeline view
- [ ] Quick actions work from queue view
- [ ] Quick actions work from SLA view
- [ ] API endpoints return expected data
- [ ] Error handling works correctly

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Screen reader announces elements
- [ ] Focus management is correct
- [ ] Color contrast is sufficient
- [ ] ARIA labels are present

## Code Examples

### Adding a New Quick Action

1. **Add Modal Function**:
```javascript
showMyAction(applicationId) {
    const modalHTML = `
        <div class="modal-overlay" id="quick-action-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">My Action</h3>
                    <button class="modal-close" onclick="QuickActionsModal.close()">×</button>
                </div>
                <div class="modal-body">
                    <form id="my-action-form">
                        <!-- Form fields -->
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="QuickActionsModal.close()">Cancel</button>
                    <button class="btn btn-primary" onclick="QuickActionsModal.submitMyAction('${applicationId}')">
                        Submit
                    </button>
                </div>
            </div>
        </div>
    `;
    this.showModal(modalHTML);
}
```

2. **Add Submit Function**:
```javascript
async submitMyAction(applicationId) {
    // Get form data
    const formData = { /* ... */ };
    
    // Validate
    if (!formData.isValid) {
        Utils.showToast('Validation error', 'warning');
        return;
    }
    
    try {
        // Disable button
        const submitBtn = document.querySelector('.modal-footer .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
        }
        
        // Call API
        await API.myAction(applicationId, formData);
        
        // Success
        Utils.showToast('Action completed successfully', 'success');
        this.close();
        DashboardComponents.refreshCurrentView();
    } catch (error) {
        // Error
        Utils.showToast(error.message || 'Action failed', 'error');
        
        // Re-enable button
        const submitBtn = document.querySelector('.modal-footer .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    }
}
```

3. **Add API Method**:
```javascript
async myAction(applicationId, data) {
    return this.request('/dashboard/actions/my-action', {
        method: 'POST',
        body: JSON.stringify({ applicationId, ...data })
    });
}
```

4. **Add Button to Views**:
```javascript
<button class="quick-action-btn" onclick="QuickActionsModal.showMyAction('${app.id}')">
    <svg>...</svg>
    My Action
</button>
```

## Conclusion

The Quick Actions UI provides a comprehensive, user-friendly interface for common loan officer tasks. The implementation is modular, maintainable, and follows best practices for modal dialogs, form validation, and API integration.
