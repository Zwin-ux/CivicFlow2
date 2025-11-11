# Task 7: Document Viewer Testing Guide

## Overview

This guide provides comprehensive testing instructions for the interactive document viewer with AI annotations and document comparison features implemented in Task 7.

## Test Files Created

1. **Unit Tests**
   - `src/services/__tests__/documentViewer.test.ts` - Document viewer component tests
   - `src/services/__tests__/documentComparison.test.ts` - Document comparison component tests

2. **Integration Tests**
   - `public/test-document-viewer.html` - Interactive browser-based test suite

3. **Demo Pages**
   - `public/document-viewer-demo.html` - Feature demonstration page

## Running Tests

### 1. Unit Tests (Jest)

```bash
# Run all tests
npm test

# Run specific test file
npm test documentViewer.test.ts
npm test documentComparison.test.ts

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### 2. Integration Tests (Browser)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the test page in your browser:
   ```
   http://localhost:3000/test-document-viewer.html
   ```

3. Run tests:
   - Click "Run All Tests" to execute all tests
   - Click "Run Viewer Tests" for document viewer tests only
   - Click "Run Comparison Tests" for comparison tests only
   - Click individual "Run Test" buttons for specific tests

### 3. Demo Page (Manual Testing)

1. Open the demo page:
   ```
   http://localhost:3000/document-viewer-demo.html
   ```

2. Test features manually:
   - Select different documents from dropdown
   - Test zoom controls
   - Navigate between pages
   - Toggle annotations
   - Test fullscreen mode
   - Compare documents side-by-side

## Test Coverage

### Document Viewer Tests (9 tests)

#### 1. Initialization Test
- **Purpose**: Verify component initializes correctly
- **Checks**:
  - Component instance created
  - DOM elements rendered
  - Toolbar present
  - Canvas container present

#### 2. Zoom Controls Test
- **Purpose**: Verify zoom functionality
- **Checks**:
  - Zoom in increases zoom level
  - Zoom out decreases zoom level
  - Min/max zoom limits respected
  - Fit to width calculates correctly
  - Zoom display updates

#### 3. Page Navigation Test
- **Purpose**: Verify page navigation
- **Checks**:
  - Next page increments page number
  - Previous page decrements page number
  - Jump to specific page works
  - Navigation buttons disabled at boundaries
  - Page input updates correctly

#### 4. Pan Functionality Test
- **Purpose**: Verify pan and drag
- **Checks**:
  - Pan enabled when zoomed in
  - Pan offset tracked correctly
  - Mouse events handled properly
  - Transform applied to canvas

#### 5. Fullscreen Mode Test
- **Purpose**: Verify fullscreen toggle
- **Checks**:
  - Fullscreen state toggles
  - Fullscreen API called
  - UI updates for fullscreen mode

#### 6. Annotation Loading Test
- **Purpose**: Verify annotation data loading
- **Checks**:
  - Annotations fetched from API
  - Annotation data parsed correctly
  - Entities and anomalies extracted
  - Confidence scores preserved

#### 7. Annotation Rendering Test
- **Purpose**: Verify annotation display
- **Checks**:
  - Bounding boxes rendered
  - Color coding by severity
  - Tooltips displayed on hover
  - Sidebar list populated

#### 8. Annotation Interaction Test
- **Purpose**: Verify annotation interactions
- **Checks**:
  - Accept annotation updates state
  - Reject annotation updates state
  - Edit annotation opens modal
  - Comments can be added
  - Audit log entries created

#### 9. Keyboard Shortcuts Test
- **Purpose**: Verify keyboard controls
- **Checks**:
  - Arrow keys navigate pages
  - Ctrl+Plus/Minus zoom
  - Ctrl+0 resets zoom
  - Ctrl+F toggles fullscreen

### Document Comparison Tests (8 tests)

#### 1. Initialization Test
- **Purpose**: Verify comparison component initializes
- **Checks**:
  - Component instance created
  - Both panels rendered
  - Toolbar present
  - Sidebar present

#### 2. Document Loading Test
- **Purpose**: Verify document loading
- **Checks**:
  - Two documents loaded
  - Document info displayed
  - Canvas rendered for both
  - Error handling works

#### 3. View Modes Test
- **Purpose**: Verify view mode switching
- **Checks**:
  - Side-by-side mode works
  - Overlay mode works
  - Diff-only mode works
  - UI updates correctly

#### 4. Difference Detection Test
- **Purpose**: Verify change detection
- **Checks**:
  - Metadata changes detected
  - Entity additions detected
  - Entity removals detected
  - Entity modifications detected
  - Bounding box comparison works

#### 5. Difference Navigation Test
- **Purpose**: Verify navigation through differences
- **Checks**:
  - Next difference navigates forward
  - Previous difference navigates backward
  - Buttons disabled at boundaries
  - Counter updates correctly
  - Scroll to difference works

#### 6. Highlighting Test
- **Purpose**: Verify difference highlighting
- **Checks**:
  - Highlights rendered on both documents
  - Color coding by severity
  - Active highlight emphasized
  - Click to select works

#### 7. Scroll Synchronization Test
- **Purpose**: Verify scroll sync
- **Checks**:
  - Scroll sync enabled/disabled
  - Vertical scroll synced
  - Horizontal scroll synced
  - No infinite loop

#### 8. Change History Test
- **Purpose**: Verify change tracking
- **Checks**:
  - Before/after values displayed
  - Change metadata tracked
  - Difference list populated
  - No differences message shown when empty

## Manual Testing Checklist

### Document Viewer

- [ ] Component loads without errors
- [ ] Toolbar displays all controls
- [ ] Zoom in button increases zoom
- [ ] Zoom out button decreases zoom
- [ ] Fit to width button works
- [ ] Rotate button rotates document
- [ ] Page navigation buttons work
- [ ] Page input allows jumping to page
- [ ] Pan works when zoomed in
- [ ] Fullscreen mode toggles correctly
- [ ] Annotations load and display
- [ ] Annotation tooltips show on hover
- [ ] Annotation sidebar opens/closes
- [ ] Accept annotation button works
- [ ] Reject annotation button works
- [ ] Edit annotation opens modal
- [ ] Comment can be added
- [ ] Keyboard shortcuts work
- [ ] Responsive design works on mobile
- [ ] Dark mode styling correct

### Document Comparison

- [ ] Component loads without errors
- [ ] Both document panels display
- [ ] View mode selector works
- [ ] Side-by-side view displays correctly
- [ ] Overlay view displays correctly
- [ ] Diff-only view displays correctly
- [ ] Documents load successfully
- [ ] Differences detected automatically
- [ ] Difference counter shows correct count
- [ ] Next/previous buttons navigate differences
- [ ] Highlights appear on both documents
- [ ] Highlights color-coded by severity
- [ ] Click highlight to select works
- [ ] Difference list populated in sidebar
- [ ] Scroll sync toggle works
- [ ] Synchronized scrolling works
- [ ] No differences message shows when appropriate
- [ ] Responsive design works on mobile
- [ ] Dark mode styling correct

## Expected Results

### All Tests Should Pass

When running the integration test suite:
- Total Tests: 17
- Passed: 17
- Failed: 0
- Pending: 0

### Performance Benchmarks

- Component initialization: < 100ms
- Document loading: < 2s (depends on document size)
- Annotation rendering: < 500ms
- Zoom/pan operations: < 50ms (60fps)
- Difference detection: < 1s for typical documents

## Troubleshooting

### Common Issues

1. **Tests fail with "Container not found"**
   - Ensure DOM is fully loaded before initializing components
   - Check container ID matches

2. **Annotations not displaying**
   - Verify API endpoint returns correct data format
   - Check console for parsing errors
   - Ensure bounding box coordinates are valid

3. **Comparison differences not detected**
   - Verify both documents have analysis data
   - Check entity extraction completed
   - Ensure document IDs are different

4. **Scroll sync not working**
   - Check syncScroll option is enabled
   - Verify event listeners attached
   - Look for infinite loop prevention

5. **Fullscreen not working**
   - Browser may block fullscreen without user gesture
   - Check browser compatibility
   - Verify fullscreen API support

## Browser Compatibility

Tested and verified on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Next Steps

After all tests pass:
1. Review test coverage report
2. Add additional edge case tests if needed
3. Document any known limitations
4. Proceed to Task 9 implementation

## Related Files

- `/public/js/components/document-viewer.js` - Main viewer component
- `/public/js/components/document-comparison.js` - Comparison component
- `/public/css/components/document-viewer.css` - Viewer styles
- `/public/css/components/document-comparison.css` - Comparison styles
- `/public/document-viewer-demo.html` - Demo page
- `/public/test-document-viewer.html` - Test page

## Support

For issues or questions:
1. Check console for error messages
2. Review test log output
3. Verify all dependencies installed
4. Check browser compatibility
5. Review component documentation
