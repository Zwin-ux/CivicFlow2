/**
 * Walkthrough Integration Example
 * Shows how to integrate the walkthrough engine into existing pages
 */

// Example 1: Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check if demo mode is active
  if (window.demoOrchestrator && window.demoOrchestrator.isActive()) {
    initializeWalkthrough();
  }
});

function initializeWalkthrough() {
  // Get or create walkthrough engine
  let walkthroughEngine = window.demoOrchestrator.getComponent('walkthroughEngine');
  
  if (!walkthroughEngine) {
    walkthroughEngine = new WalkthroughEngine(window.demoOrchestrator);
    window.demoOrchestrator.registerComponent('walkthroughEngine', walkthroughEngine);
  }
  
  // Check if this is first visit
  const hasSeenWalkthrough = localStorage.getItem('walkthrough_dashboard_seen');
  
  if (!hasSeenWalkthrough) {
    // Show walkthrough after a short delay
    setTimeout(() => {
      showDashboardWalkthrough();
    }, 1000);
  }
  
  // Add "Start Tour" button to page
  addStartTourButton();
}

// Example 2: Define a walkthrough for the dashboard
async function showDashboardWalkthrough() {
  const walkthroughEngine = window.demoOrchestrator.getComponent('walkthroughEngine');
  
  if (!walkthroughEngine) {
    console.error('Walkthrough engine not available');
    return;
  }
  
  const dashboardWalkthrough = {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    description: 'Learn about the key features of your dashboard',
    estimatedDuration: 90,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to CivicFlow2',
        description: 'This quick tour will show you the main features of your dashboard. You can skip at any time by pressing ESC or clicking "Skip Tour".',
        targetElement: '.dashboard-header',
        position: 'bottom',
        highlightStyle: {
          animation: 'pulse'
        }
      },
      {
        id: 'metrics',
        title: 'Key Metrics',
        description: 'View important metrics at a glance. These update in real-time as applications are processed.',
        targetElement: '.metrics-panel',
        position: 'auto',
        highlightStyle: {
          animation: 'glow'
        }
      },
      {
        id: 'applications',
        title: 'Recent Applications',
        description: 'See the latest applications submitted. Click on any application to view details.',
        targetElement: '.applications-list',
        position: 'top',
        highlightStyle: {
          animation: 'pulse'
        }
      },
      {
        id: 'filters',
        title: 'Filters & Search',
        description: 'Use filters to find specific applications quickly. You can filter by status, date, amount, and more.',
        targetElement: '.filter-controls',
        position: 'bottom',
        highlightStyle: {
          animation: 'glow'
        }
      },
      {
        id: 'actions',
        title: 'Quick Actions',
        description: 'Access common actions quickly from this menu. Create new applications, run reports, and more.',
        targetElement: '.quick-actions',
        position: 'left',
        highlightStyle: {
          animation: 'pulse'
        }
      },
      {
        id: 'notifications',
        title: 'Notifications',
        description: 'Stay updated with real-time notifications about application status changes and important events.',
        targetElement: '.notification-bell',
        position: 'bottom',
        highlightStyle: {
          animation: 'glow'
        }
      },
      {
        id: 'profile',
        title: 'Your Profile',
        description: 'Access your profile settings, preferences, and account information here.',
        targetElement: '.user-profile',
        position: 'bottom',
        highlightStyle: {
          animation: 'pulse'
        }
      },
      {
        id: 'complete',
        title: 'You\'re All Set!',
        description: 'You\'ve completed the dashboard tour. Explore the features and let us know if you have any questions!',
        targetElement: '.dashboard-header',
        position: 'center',
        highlightStyle: {
          animation: 'glow'
        }
      }
    ]
  };
  
  try {
    await walkthroughEngine.loadWalkthrough(dashboardWalkthrough);
    await walkthroughEngine.start();
    
    // Mark as seen
    localStorage.setItem('walkthrough_dashboard_seen', 'true');
  } catch (error) {
    console.error('Failed to start walkthrough:', error);
  }
}

// Example 3: Add a "Start Tour" button
function addStartTourButton() {
  // Check if button already exists
  if (document.querySelector('.start-tour-button')) {
    return;
  }
  
  // Create button
  const button = document.createElement('button');
  button.className = 'start-tour-button';
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="margin-right: 6px;">
      <path d="M8 1L10.5 6L16 7L12 11L13 16L8 13.5L3 16L4 11L0 7L5.5 6L8 1Z" fill="currentColor"/>
    </svg>
    Start Tour
  `;
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #8b5cf6;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    display: flex;
    align-items: center;
    z-index: 1000;
    transition: all 150ms ease;
  `;
  
  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.background = '#7c3aed';
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.background = '#8b5cf6';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
  });
  
  // Click handler
  button.addEventListener('click', () => {
    showDashboardWalkthrough();
  });
  
  // Add to page
  document.body.appendChild(button);
}

// Example 4: Context-sensitive walkthrough
function showContextWalkthrough(context) {
  const walkthroughs = {
    'application-detail': 'application-review',
    'ai-insights': 'ai-features',
    'admin-panel': 'admin-tools'
  };
  
  const walkthroughId = walkthroughs[context];
  
  if (walkthroughId && window.demoOrchestrator) {
    window.demoOrchestrator.startWalkthrough(walkthroughId);
  }
}

// Example 5: Listen to walkthrough events
if (window.demoOrchestrator) {
  window.demoOrchestrator.on('walkthrough-completed', (data) => {
    console.log('Walkthrough completed:', data.walkthroughId);
    
    // Show completion message
    showCompletionMessage();
    
    // Track in analytics
    if (window.gtag) {
      gtag('event', 'walkthrough_completed', {
        walkthrough_id: data.walkthroughId
      });
    }
  });
  
  window.demoOrchestrator.on('walkthrough-stopped', (data) => {
    console.log('Walkthrough stopped:', data.walkthroughId);
  });
}

function showCompletionMessage() {
  // Create toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    z-index: 10001;
    animation: slideIn 300ms ease;
  `;
  toast.textContent = '✓ Tour completed! You\'re ready to go.';
  
  document.body.appendChild(toast);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 300ms ease';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Example 6: Load walkthrough from JSON file
async function loadWalkthroughFromFile(walkthroughId) {
  const walkthroughEngine = window.demoOrchestrator.getComponent('walkthroughEngine');
  
  if (!walkthroughEngine) {
    console.error('Walkthrough engine not available');
    return;
  }
  
  try {
    // Load from JSON file
    await walkthroughEngine.loadWalkthrough(walkthroughId);
    await walkthroughEngine.start();
  } catch (error) {
    console.error('Failed to load walkthrough:', error);
    
    // Fallback to inline definition
    showDashboardWalkthrough();
  }
}

// Example 7: Programmatic control
function controlWalkthrough() {
  const walkthroughEngine = window.demoOrchestrator.getComponent('walkthroughEngine');
  
  if (!walkthroughEngine) return;
  
  // Get current progress
  const progress = walkthroughEngine.getProgress();
  console.log(`Step ${progress.current} of ${progress.total}`);
  
  // Get current step
  const step = walkthroughEngine.getCurrentStep();
  console.log('Current step:', step?.title);
  
  // Navigate
  // walkthroughEngine.next();
  // walkthroughEngine.previous();
  // walkthroughEngine.skip();
  
  // Pause/resume
  // walkthroughEngine.pause();
  // walkthroughEngine.resume();
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
  window.walkthroughIntegration = {
    initialize: initializeWalkthrough,
    showDashboard: showDashboardWalkthrough,
    showContext: showContextWalkthrough,
    loadFromFile: loadWalkthroughFromFile,
    control: controlWalkthrough
  };
}
