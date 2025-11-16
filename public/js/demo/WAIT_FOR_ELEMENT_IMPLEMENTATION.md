# Wait For Element Implementation

## Overview

The `waitForElement` method in the Walkthrough Engine handles dynamic element loading, allowing walkthroughs to wait for elements that may not be immediately available in the DOM.

## Implementation Details

### Method Signature

```javascript
async waitForElement(selector, shouldWait = true, timeout = 5000)
```

### Parameters

- **selector** (string): CSS selector for the target element
- **shouldWait** (boolean, default: true): Whether to wait for the element or return immediately
- **timeout** (number, default: 5000): Maximum time to wait in milliseconds

### Return Value

Returns a `Promise<Element|null>`:
- `Element`: The found element
- `null`: If element not found within timeout or if `shouldWait` is false

## How It Works

### 1. Immediate Check
First, the method attempts to find the element immediately:
```javascript
const element = document.querySelector(selector);
if (element || !shouldWait) {
  return element;
}
```

### 2. MutationObserver
If the element is not found and `shouldWait` is true, a `MutationObserver` is set up to watch for DOM changes:
```javascript
const observer = new MutationObserver(() => {
  const el = document.querySelector(selector);
  if (el) {
    observer.disconnect();
    resolve(el);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### 3. Polling Fallback
In addition to the MutationObserver, a polling mechanism checks every 100ms:
```javascript
const interval = setInterval(() => {
  const el = document.querySelector(selector);
  if (el) {
    clearInterval(interval);
    observer.disconnect();
    resolve(el);
  }
}, 100);
```

### 4. Timeout Handling
Both the observer and polling check for timeout:
```javascript
if (Date.now() - startTime > timeout) {
  observer.disconnect();
  clearInterval(interval);
  resolve(null);
}
```

## Usage in Walkthrough Steps

### Basic Usage
```javascript
{
  id: 'step-1',
  title: 'Dynamic Content',
  description: 'This step waits for dynamic content to load',
  targetElement: '#dynamic-element',
  waitForElement: true, // Enable waiting (default)
  position: 'auto'
}
```

### With Custom Action
```javascript
{
  id: 'step-2',
  title: 'Loading Data',
  description: 'Waiting for data to load...',
  targetElement: '#data-container',
  waitForElement: true,
  action: async () => {
    // Trigger data loading
    await loadData();
  }
}
```

### Disable Waiting
```javascript
{
  id: 'step-3',
  title: 'Optional Element',
  description: 'This step continues even if element is missing',
  targetElement: '#optional-element',
  waitForElement: false, // Don't wait
  position: 'center'
}
```

## Graceful Degradation

When an element is not found within the timeout period:

1. The method returns `null`
2. The walkthrough continues without highlighting
3. The tooltip is displayed in the center of the screen
4. No error is thrown - the walkthrough remains functional

```javascript
const element = await this.waitForElement(step.targetElement, step.waitForElement !== false);

if (!element) {
  console.warn('[Walkthrough Engine] Target element not found:', step.targetElement);
  // Show tooltip without highlight
  this.updateTooltip(step);
  this.positionTooltip(null, step.position || 'center');
  await this.fadeInElements(false);
  return;
}
```

## Performance Considerations

### Dual Detection Strategy
The implementation uses both MutationObserver and polling:
- **MutationObserver**: Efficient for detecting DOM changes
- **Polling**: Fallback for cases where MutationObserver might miss changes

### Cleanup
Both mechanisms are properly cleaned up when:
- Element is found
- Timeout is reached
- Walkthrough is stopped

### Timeout Configuration
The default 5-second timeout balances:
- User experience (not waiting too long)
- Network latency (allowing time for async operations)
- Resource usage (limiting observer lifetime)

## Testing

### Test Scenarios

A comprehensive test page is available at `/test-dynamic-elements.html` with four scenarios:

1. **Immediate Element**: Element already in DOM
2. **Delayed Element (2s)**: Element appears after 2 seconds
3. **Very Delayed Element (4s)**: Element appears after 4 seconds
4. **Missing Element**: Element never appears (timeout test)

### Running Tests

1. Start the server
2. Navigate to `http://localhost:3000/test-dynamic-elements.html`
3. Click each test button to verify behavior
4. Check console for detailed logs

### Expected Behavior

- **Test 1**: Walkthrough starts immediately, no waiting
- **Test 2**: Walkthrough waits 2 seconds, then highlights element
- **Test 3**: Walkthrough waits 4 seconds, then highlights element
- **Test 4**: Walkthrough waits 5 seconds, then shows tooltip without highlight

## Integration with Walkthrough Flow

The `waitForElement` method is called in the `showStep` method:

```javascript
async showStep(index) {
  const step = this.currentWalkthrough.steps[index];
  
  // Execute step action if provided
  if (step.action && typeof step.action === 'function') {
    await step.action();
  }
  
  // Wait for element if needed
  const element = await this.waitForElement(
    step.targetElement, 
    step.waitForElement !== false
  );
  
  // Continue with highlighting and tooltip display
  // ...
}
```

## Best Practices

### 1. Use with Actions
Combine `waitForElement` with step actions to trigger loading:
```javascript
{
  targetElement: '#results',
  waitForElement: true,
  action: async () => {
    await fetchResults();
  }
}
```

### 2. Provide User Feedback
Use descriptive step descriptions to inform users about waiting:
```javascript
{
  title: 'Loading Results',
  description: 'Please wait while we load the search results...',
  targetElement: '#results',
  waitForElement: true
}
```

### 3. Set Appropriate Timeouts
For slower operations, consider increasing the timeout:
```javascript
// In walkthrough engine configuration
this.config = {
  waitTimeout: 10000 // 10 seconds for slow operations
};
```

### 4. Handle Missing Elements Gracefully
Always provide meaningful content even when elements are missing:
```javascript
{
  title: 'Optional Feature',
  description: 'This feature may not be available in all configurations',
  targetElement: '#optional-feature',
  waitForElement: true,
  position: 'center' // Center position works well for missing elements
}
```

## Browser Compatibility

The implementation uses:
- **MutationObserver**: Supported in all modern browsers (IE11+)
- **Promises**: Native support in all modern browsers
- **querySelector**: Universal support

No polyfills required for modern browsers.

## Troubleshooting

### Element Never Found
- Verify the CSS selector is correct
- Check if element is added to DOM (not just made visible)
- Increase timeout if needed
- Check console for warnings

### Performance Issues
- Reduce number of steps with `waitForElement: true`
- Use more specific selectors
- Consider disabling waiting for optional elements

### Timing Issues
- Ensure step actions complete before element is expected
- Use `async/await` properly in step actions
- Check network timing for async operations

## Future Enhancements

Potential improvements for future versions:

1. **Custom Timeout Per Step**: Allow timeout override per step
2. **Retry Logic**: Automatic retry with exponential backoff
3. **Loading Indicators**: Built-in loading state display
4. **Element Visibility Check**: Wait for element to be visible, not just in DOM
5. **Multiple Element Support**: Wait for multiple elements simultaneously

## Conclusion

The `waitForElement` implementation provides robust support for dynamic content in walkthroughs, ensuring a smooth user experience even when elements load asynchronously. The dual detection strategy (MutationObserver + polling) combined with graceful timeout handling makes it reliable across various scenarios.
