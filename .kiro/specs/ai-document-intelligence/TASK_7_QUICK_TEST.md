# Task 7: Quick Test Guide

## 🚀 Quick Start

### 1. Run Unit Tests
```bash
npm test -- documentViewer.test.ts documentComparison.test.ts
```

### 2. Run Integration Tests
1. Start server: `npm run dev`
2. Open: http://localhost:3000/test-document-viewer.html
3. Click "Run All Tests"

### 3. View Demo
1. Open: http://localhost:3000/document-viewer-demo.html
2. Select a document from dropdown
3. Test all features manually

## ✅ Quick Verification Checklist

### Document Viewer (2 minutes)
- [ ] Open demo page
- [ ] Select "Bank Statement (PDF)"
- [ ] Click zoom in/out buttons
- [ ] Navigate to page 2
- [ ] Click "Toggle Annotations"
- [ ] Click fullscreen button

### Document Comparison (2 minutes)
- [ ] Switch to "Document Comparison" tab
- [ ] Select "Bank Statement v1" and "Bank Statement v2"
- [ ] Click "Load Comparison"
- [ ] Click next/previous difference buttons
- [ ] Toggle "Sync Scroll"
- [ ] Change view mode dropdown

## 📊 Expected Test Results

### Unit Tests
```
PASS  src/services/__tests__/documentViewer.test.ts
  Document Viewer Component
    ✓ Initialization (9 tests)
    ✓ Zoom Controls (4 tests)
    ✓ Page Navigation (5 tests)
    ✓ Pan Functionality (2 tests)
    ✓ Fullscreen Mode (1 test)
    ✓ Annotation System (4 tests)
    ✓ Annotation Interactions (5 tests)
    ✓ Keyboard Shortcuts (1 test)

PASS  src/services/__tests__/documentComparison.test.ts
  Document Comparison Component
    ✓ Initialization (3 tests)
    ✓ Document Loading (4 tests)
    ✓ View Modes (3 tests)
    ✓ Difference Detection (5 tests)
    ✓ Difference Navigation (5 tests)
    ✓ Highlighting (4 tests)
    ✓ Scroll Synchronization (3 tests)
    ✓ Change History (3 tests)

Test Suites: 2 passed, 2 total
Tests:       17 passed, 17 total
```

### Integration Tests
```
Total Tests: 17
Passed: 17
Failed: 0
Pending: 0
```

## 🐛 Common Issues & Fixes

### Issue: "Container not found"
**Fix**: Refresh page and try again

### Issue: Annotations not showing
**Fix**: Ensure demo mode is active or use real document IDs

### Issue: Comparison shows no differences
**Fix**: Select different document versions (v1 vs v2)

### Issue: Tests timeout
**Fix**: Increase timeout in jest.config.js to 10000ms

## 📁 Key Files

| File | Purpose |
|------|---------|
| `public/test-document-viewer.html` | Interactive test suite |
| `public/document-viewer-demo.html` | Feature demo |
| `public/js/components/document-viewer.js` | Viewer component |
| `public/js/components/document-comparison.js` | Comparison component |
| `src/services/__tests__/documentViewer.test.ts` | Unit tests |
| `src/services/__tests__/documentComparison.test.ts` | Unit tests |

## 🎯 Success Criteria

All tests pass ✅
- Unit tests: 17/17 passed
- Integration tests: 17/17 passed
- Manual verification: All features working
- No console errors
- Responsive on mobile
- Dark mode works

## ⏭️ Next Steps

Once all tests pass:
1. ✅ Mark Task 7 as complete
2. ✅ Review test coverage
3. ✅ Document any limitations
4. ➡️ **Ready to proceed to Task 9**

## 💡 Tips

- Use Chrome DevTools for debugging
- Check Network tab for API calls
- Use Console for error messages
- Test in both light and dark mode
- Test on different screen sizes
- Clear browser cache if issues persist

---

**Last Updated**: Task 7 Implementation
**Status**: ✅ Ready for Testing
