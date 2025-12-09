/**
 * UI State Management Module
 *
 * Handles navigation, page visibility, history management, and menu state.
 * Centralizes all UI state logic to improve maintainability.
 */

const UIStateManager = {
  /**
   * Page states
   */
  PAGES: {
    HOME: 'home',
    CATEGORY: 'category',
    SINGLE: 'single',
  },

  /**
   * Current page state
   */
  currentPage: 'home',

  /**
   * Initialize UI state manager
   */
  init() {
    this.restoreState();
  },

  /**
   * Show a page and hide others
   *
   * @param {string} pageType - Page type (home, category, single)
   */
  showPage(pageType) {
    jQuery('#homepage, #category-page, #single-post-page').hide();

    switch (pageType) {
      case this.PAGES.HOME:
        jQuery('#homepage').show();
        break;
      case this.PAGES.CATEGORY:
        jQuery('#category-page').show();
        break;
      case this.PAGES.SINGLE:
        jQuery('#single-post-page').show();
        break;
    }

    this.currentPage = pageType;
  },

  /**
   * Save current state to localStorage
   *
   * @param {string} pageType - Current page type
   * @param {Object} data - Additional data to save (catId, postId, etc)
   */
  saveState(pageType, data = {}) {
    localStorage.setItem('currentPage', pageType);

    if (data.catId) {
      localStorage.setItem('currentCatId', data.catId);
    }
    if (data.postId) {
      localStorage.setItem('currentPostId', data.postId);
    }

    this.currentPage = pageType;
  },

  /**
   * Restore UI state from localStorage
   */
  restoreState() {
    jQuery('#homepage, #category-page, #single-post-page').hide();

    const savedPage = localStorage.getItem('currentPage');

    if (savedPage === this.PAGES.CATEGORY) {
      const catId = localStorage.getItem('currentCatId');
      if (catId) {
        return { page: this.PAGES.CATEGORY, catId: parseInt(catId) };
      }
    } else if (savedPage === this.PAGES.SINGLE) {
      const postId = localStorage.getItem('currentPostId');
      if (postId) {
        return { page: this.PAGES.SINGLE, postId: parseInt(postId) };
      }
    }

    jQuery('#homepage').show();
    this.currentPage = this.PAGES.HOME;
    return { page: this.PAGES.HOME };
  },

  /**
   * Push state to browser history
   *
   * @param {string} page - Page type
   * @param {Object} data - Additional state data
   */
  pushHistory(page, data = {}) {
    history.pushState({ page, ...data }, '', window.location.href);
  },

  /**
   * Handle back button click
   */
  goBack() {
    const currentSlug = jQuery('.back-btn').data('cat-slug');
    jQuery('#homepage, #category-page, #single-post-page').hide();
    jQuery('#subcategory-container').remove();

    if (this.currentPage === this.PAGES.SINGLE) {
      const catId = localStorage.getItem('currentCatId');
      if (catId) {
        return { action: 'loadCategory', catId: parseInt(catId) };
      }
      jQuery('#homepage').show();
      this.saveState(this.PAGES.HOME);
      return { action: 'home' };
    } else if (this.currentPage === this.PAGES.CATEGORY) {
      jQuery('#homepage').show();
      jQuery(`#category-header, #single-post-header`).removeClass(currentSlug);
      this.saveState(this.PAGES.HOME);
      return { action: 'home' };
    }

    return { action: 'none' };
  },

  /**
   * Toggle mobile menu visibility
   */
  toggleMenu(state) {
    if (state === 'open') {
      jQuery('.sidebar-menu').addClass('active');
    } else if (state === 'close') {
      jQuery('.sidebar-menu').removeClass('active');
    } else {
      jQuery('.sidebar-menu').toggleClass('active');
    }
  },

  /**
   * Toggle dropdown menu
   *
   * @param {jQuery} $dropdown - Dropdown element
   */
  toggleDropdown($dropdown) {
    jQuery('.custom-dropdown, .custom-dropdown-single')
      .not($dropdown)
      .removeClass('active');
    $dropdown.toggleClass('active');
  },

  /**
   * Close all dropdowns
   */
  closeAllDropdowns() {
    jQuery('.custom-dropdown, .custom-dropdown-single').removeClass('active');
  },

  /**
   * Toggle mobile menu visibility based on media query
   */
  handleMobileMenuVisibility() {
    if (isMobileDevice()) {
      jQuery('.menu-head-wrap').hide();
    } else {
      jQuery('.menu-head-wrap').show();
    }
  },

  /**
   * Show location info popup
   */
  showLocationInfo() {
    this.handleMobileMenuVisibility();
    jQuery('#map').addClass('media-map');
    jQuery('.service_cat').hide();
    jQuery('.location-info-wrap').fadeIn();
  },

  /**
   * Hide location info popup
   */
  hideLocationInfo() {
    if (jQuery('.search-data').length > 0) {
      jQuery('.service_cat').hide();
      jQuery('.search-data').show();
      jQuery('.menu-head-wrap').show();
    } else {
      jQuery('.service_cat').show();
      jQuery('.menu-head-wrap').show();
    }

    jQuery('.location-info-wrap').fadeOut();
    jQuery('#map').removeClass('media-map');
    jQuery('#search-map').removeClass('search-media-map');
  },
};
