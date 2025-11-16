/**
 * Comment Added Event Generator - Integration Example
 * Demonstrates how to use the comment_added generator in various scenarios
 */

// Initialize event generators
const eventGenerators = new EventGenerators();

// Example 1: Generate a standalone comment
console.log('Example 1: Standalone Comment');
const comment1 = eventGenerators.generateCommentAdded();
console.log('Comment:', comment1);
console.log('Description:', eventGenerators.generateCommentAddedDescription(comment1));

// Example 2: Generate comment for specific application
console.log('\nExample 2: Comment for Specific Application');
const application = {
  applicationId: 'APP-12345',
  businessName: 'Acme Manufacturing LLC',
  status: 'UNDER_REVIEW',
  loanAmount: 150000,
  location: 'Springfield, IL',
  industry: 'Manufacturing'
};
const comment2 = eventGenerators.generateCommentAdded(application);
console.log('Comment for', comment2.businessName);

// Example 3: Integration with Live Simulator
console.log('\nExample 3: Live Simulator Integration');
function simulateCommentEvent() {
  const comment = eventGenerators.generateCommentAdded();
  
  // Show notification
  showNotification({
    title: 'New Comment',
    message: `${comment.commenter} commented on ${comment.businessName}`,
    type: comment.priority === 'high' ? 'warning' : 'info'
  });
  
  // Update activity feed
  addToActivityFeed({
    type: 'comment_added',
    icon: '💬',
    text: eventGenerators.generateCommentAddedDescription(comment),
    timestamp: comment.commentedAt
  });
}

// Example 4: Filter comments by type
console.log('\nExample 4: Generate Comments by Type');
const commentsByType = {
  questions: [],
  requests: [],
  notes: []
};

for (let i = 0; i < 20; i++) {
  const comment = eventGenerators.generateCommentAdded();
  if (comment.commentType === 'question') {
    commentsByType.questions.push(comment);
  } else if (comment.commentType === 'information_request') {
    commentsByType.requests.push(comment);
  } else if (comment.commentType === 'note') {
    commentsByType.notes.push(comment);
  }
}

console.log('Questions:', commentsByType.questions.length);
console.log('Requests:', commentsByType.requests.length);
console.log('Notes:', commentsByType.notes.length);
