/**
 * Mobile Navigation Handler
 * Handles hamburger menu toggle and mobile navigation
 * Requirements: 9.2 - Hamburger menu for mobile navigation
 */

(function() {
  'use strict';

  // Initialize mobile navigation when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }

  function initMobileNav() {
    // Check if navigation exists
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Create hamburger button if it doesn't exist
    let navToggle = navbar.querySelector('.nav-toggle');
    if (!navToggle) {
      navToggle = createHamburgerButton();
      const container = navbar.querySelector('.container');
      if (container) {
        container.appendChild(navToggle);
      }
    }

    // Get navigation links
    const navLinks = navbar.querySelector('.nav-links');
    if (!navLinks) return;

    // Create overlay for mobile menu
    let overlay = document.querySelector('.nav-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'nav-overlay';
      document.body.appendChild(overlay);
    }

    // Toggle menu function
    function toggleMenu() {
      const isActive = navLinks.classList.contains('active');
      
      if (isActive) {
        closeMenu();
      } else {
        openMenu();
      }
    }

    function openMenu() {
      navLinks.classList.add('active');
      navToggle.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
      navToggle.setAttribute('aria-expanded', 'true');
    }

    function closeMenu() {
      navLinks.classList.remove('active');
      navToggle.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      navToggle.setAttribute('aria-expanded', 'false');
    }

    // Event listeners
    navToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);

    // Close menu when clicking on a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', () => {
        // Only close on mobile
        if (window.innerWidth < 768) {
          closeMenu();
        }
      });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        closeMenu();
      }
    });

    // Close menu when resizing to desktop
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth >= 768 && navLinks.classList.contains('active')) {
          closeMenu();
        }
      }, 250);
    });

    // Trap focus within menu when open
    navLinks.addEventListener('keydown', (e) => {
      if (!navLinks.classList.contains('active')) return;

      const focusableElements = navLinks.querySelectorAll('a, button');
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  function createHamburgerButton() {
    const button = document.createElement('button');
    button.className = 'nav-toggle';
    button.setAttribute('aria-label', 'Toggle navigation menu');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('type', 'button');

    const icon = document.createElement('span');
    icon.className = 'nav-toggle-icon';
    icon.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;

    button.appendChild(icon);
    return button;
  }

  // Export for use in other scripts if needed
  window.MobileNav = {
    init: initMobileNav
  };
})();
