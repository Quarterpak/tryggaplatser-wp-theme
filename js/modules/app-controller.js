/**
 * Main Application Controller - Single Map Version
 *
 * Uses ONE persistent map instance throughout the application.
 * Only updates markers and view, never recreates the map.
 */

const AppController = {
  // Stockholm Central coordinates (fallback)
  STOCKHOLM_CENTRAL_LAT: 59.33024608264878,
  STOCKHOLM_CENTRAL_LNG: 18.058248426091545,

  // Cache user location
  userLat: null,
  userLng: null,

  // Store original homepage view
  originalHomepageView: null,

  /**
   * Initialize the application
   */
  init() {
    this.setupGeolocation();
    this.setupEventListeners();
    this.initializeMap();
    this.initializeHomepage();
  },

  /**
   * Initialize the map ONCE on app startup
   */
  initializeMap() {
    console.log('Initializing single map instance...');
    MapManager.initMap();
  },

  /**
   * Get user location via geolocation API
   */
  setupGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLat = position.coords.latitude;
          this.userLng = position.coords.longitude;

          // Add user marker to map if already initialized
          if (MapManager.getMap()) {
            MapManager.addUserMarker(this.userLat, this.userLng);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        }
      );
    }
  },

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Find the location closest to a given point
   */
  findClosestLocation(locations, refLat, refLng) {
    if (!locations || locations.length === 0) return null;

    let closest = null;
    let minDistance = Infinity;

    locations.forEach((location) => {
      const locationLat = parseFloat(location.lat);
      const locationLng = parseFloat(location.lng || location.long);

      if (locationLat && locationLng) {
        const distance = this.calculateDistance(
          refLat,
          refLng,
          locationLat,
          locationLng
        );
        if (distance < minDistance) {
          minDistance = distance;
          closest = location;
        }
      }
    });

    return closest;
  },

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    jQuery(document).on('click', '.service_cat_list_details', (e) =>
      this.onCategoryClick(e)
    );

    jQuery(document).on('click', '.category_card_link, .read-more-link', (e) =>
      this.onPostClick(e)
    );

    jQuery(document).on('click', '.category_card', (e) =>
      this.onCategoryCardClick(e)
    );

    jQuery(document).on('click', '.back-btn', () => this.onBackClick());

    jQuery(document).on('click', '.btn_icon, .bo-btn-direction', (e) =>
      this.onDirectionsClick(e)
    );

    jQuery(document).on(
      'click',
      '.location-info-wrap .close-location, .location-info-wrap .close-icon',
      () => this.onCloseLocationInfo()
    );

    jQuery(document).on('click', '.header-controls .open-menu-cat', () =>
      UIStateManager.toggleMenu('open')
    );

    jQuery(document).on(
      'click',
      '.dropdown-toggle, .dropdown-toggle-single',
      (e) => this.onDropdownToggle(e)
    );

    jQuery(document)
      .off('change', "#subcategory-container input[type='checkbox']")
      .on('change', "#subcategory-container input[type='checkbox']", () =>
        this.onSubcategoryFilter()
      );

    jQuery(document)
      .off('change', '.dropdown-item-single input[type="checkbox"]')
      .on('change', '.dropdown-item-single input[type="checkbox"]', () =>
        this.onGroupSelectionChange()
      );
  },

  /**
   * Initialize homepage with map
   */
  initializeHomepage() {
    const savedState = UIStateManager.restoreState();

    if (savedState.page === UIStateManager.PAGES.CATEGORY) {
      this.loadCategory(savedState.catId, false);
    } else if (savedState.page === UIStateManager.PAGES.SINGLE) {
      this.loadSinglePost(savedState.postId, false);
    } else {
      this.loadHomepage();
    }
  },

  /**
   * Load homepage with all locations
   */
  loadHomepage() {
    UIStateManager.showPage(UIStateManager.PAGES.HOME);

    // Fetch and display markers on the existing map
    DataFetcher.getAllLocations()
      .done((response) => {
        if (response.success) {
          this.displayMarkersOnHomepage(response.data);
        }
      })
      .fail(() => {
        MapManager.setView(
          this.STOCKHOLM_CENTRAL_LAT,
          this.STOCKHOLM_CENTRAL_LNG,
          12
        );
      });
  },

  /**
   * Display markers on homepage map
   */
  displayMarkersOnHomepage(locations) {
    if (this.userLat && this.userLng) {
      // With geolocation: add user marker and center on user
      MapManager.addUserMarker(this.userLat, this.userLng);
      MapManager.setView(this.userLat, this.userLng, 13);

      this.originalHomepageView = {
        lat: this.userLat,
        lng: this.userLng,
        zoom: 13,
      };
    } else {
      // Without geolocation: center on Stockholm Central
      MapManager.setView(
        this.STOCKHOLM_CENTRAL_LAT,
        this.STOCKHOLM_CENTRAL_LNG,
        12
      );

      this.originalHomepageView = {
        lat: this.STOCKHOLM_CENTRAL_LAT,
        lng: this.STOCKHOLM_CENTRAL_LNG,
        zoom: 12,
      };
    }

    // Add markers to the existing map
    MapManager.addMarkers(locations, (location) =>
      this.onMarkerClick(location)
    );
  },

  /**
   * Handle marker click on homepage
   */
  onMarkerClick(location) {
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng || location.long);

    if (lat && lng) {
      MapManager.flyTo(lat, lng, 16);
    }

    UIStateManager.showLocationInfo();
    Renderer.renderLocationInfoPopup(location);
  },

  /**
   * Handle category click
   */
  onCategoryClick(e) {
    e.preventDefault();

    const $link = jQuery(e.currentTarget);
    const catId = $link.data('cat-id');
    const catSlug = $link.data('cat-slug');
    const catName = $link.data('cat-name');
    const catImage = $link.data('cat-image');

    UIStateManager.showPage(UIStateManager.PAGES.CATEGORY);

    Renderer.renderCategoryHeaderInstant({
      cat_slug: catSlug,
      cat_name: catName,
      cat_image: catImage,
    });

    this.loadCategory(catId, true);
  },

  /**
   * Load category and its posts
   */
  loadCategory(catId, pushHistory = true) {
    UIStateManager.showPage(UIStateManager.PAGES.CATEGORY);
    UIStateManager.saveState(UIStateManager.PAGES.CATEGORY, { catId });

    if (pushHistory) {
      UIStateManager.pushHistory(UIStateManager.PAGES.CATEGORY, { catId });
    }

    Renderer.showCategoryLoader();

    DataFetcher.getCategoryPosts(catId)
      .done((response) => {
        if (response.success && response.data.length > 0) {
          this.displayCategoryPosts(response.data, catId);
          this.loadCategorySubcategories(catId);
        }
      })
      .fail(() => {
        Renderer.hideCategoryLoader();
      });
  },

  /**
   * Display posts in category view
   */
  displayCategoryPosts(posts, catId) {
    Renderer.hideCategoryLoader();
    Renderer.renderCategoryPosts(posts, catId);

    if (posts.length > 0) {
      Renderer.renderCategoryHeader(posts[0]);
    }

    // Update markers on the existing map (don't recreate it)
    MapManager.addMarkers(posts, (post) => {
      this.movePostToTop(post.id);
    });

    MapManager.invalidateSize();

    // Add user marker if available
    if (this.userLat && this.userLng) {
      MapManager.addUserMarker(this.userLat, this.userLng);
    }

    // Center map on closest location
    setTimeout(() => {
      if (this.userLat && this.userLng) {
        const closest = this.findClosestLocation(
          posts,
          this.userLat,
          this.userLng
        );
        if (closest) {
          const closestLat = parseFloat(closest.lat);
          const closestLng = parseFloat(closest.lng || closest.long);
          MapManager.flyTo(closestLat, closestLng, 13);
        }
      } else {
        const closest = this.findClosestLocation(
          posts,
          this.STOCKHOLM_CENTRAL_LAT,
          this.STOCKHOLM_CENTRAL_LNG
        );
        if (closest) {
          const closestLat = parseFloat(closest.lat);
          const closestLng = parseFloat(closest.lng || closest.long);
          MapManager.flyTo(closestLat, closestLng, 13);
        } else if (posts.length > 0) {
          const firstLat = parseFloat(posts[0].lat);
          const firstLng = parseFloat(posts[0].lng || posts[0].long);
          MapManager.flyTo(firstLat, firstLng, 13);
        }
      }
    }, 300);
  },

  /**
   * Load subcategories for current category
   */
  loadCategorySubcategories(catId) {
    DataFetcher.getSubcategoriesByParent(catId).done((response) => {
      if (response.success && response.data.data.length > 0) {
        Renderer.renderSubcategoryDropdown(response.data.data);
      }
    });
  },

  /**
   * Move post to top of list
   */
  movePostToTop(postId) {
    const listWrapper = document.getElementById('category-posts');
    if (!listWrapper) return;

    const selectedItem = listWrapper.querySelector(
      `[data-post-id="${postId}"]`
    );
    if (!selectedItem) return;

    const lat = parseFloat(selectedItem.dataset.lat);
    const lng = parseFloat(selectedItem.dataset.lng);

    if (lat && lng) {
      MapManager.flyTo(lat, lng, 16);
    }

    listWrapper.prepend(selectedItem);
    selectedItem.classList.add('selected-highlight');
    setTimeout(() => {
      selectedItem.classList.remove('selected-highlight');
    }, 1500);
  },

  /**
   * Handle category card click to center map
   */
  onCategoryCardClick(e) {
    if (jQuery(e.target).closest('.category_card_link').length) {
      return;
    }

    const $link = jQuery(e.currentTarget).closest('.category_card_link');
    if (!$link.length) return;

    const lat = parseFloat($link.data('lat'));
    const lng = parseFloat($link.data('lng'));

    if (lat && lng) {
      MapManager.flyTo(lat, lng, 16);

      const mapElement = document.getElementById('main-map');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  },

  /**
   * Handle post click
   */
  onPostClick(e) {
    e.preventDefault();
    const $link = jQuery(e.currentTarget);
    const postId = $link.data('post-id');
    const catId = $link.data('cat-id') || 0;
    const catSlug = $link.data('cat-slug');
    const catName = $link.data('cat-name');
    const catImage = $link.data('cat-image');
    const postImage = $link.data('post-image');

    UIStateManager.showPage(UIStateManager.PAGES.SINGLE);
    Renderer.renderSingleHeaderInstant({
      cat_slug: catSlug,
      cat_name: catName,
      cat_image: catImage,
      post_image: postImage,
    });

    this.loadSinglePost(postId, true, catId);
  },

  /**
   * Load single post page
   */
  loadSinglePost(postId, pushHistory = true, catId = 0) {
    UIStateManager.showPage(UIStateManager.PAGES.SINGLE);
    UIStateManager.saveState(UIStateManager.PAGES.SINGLE, { postId });

    if (pushHistory) {
      UIStateManager.pushHistory(UIStateManager.PAGES.SINGLE, { postId });
    }

    Renderer.showSinglePostLoader();

    DataFetcher.getSinglePost(postId, catId)
      .done((response) => {
        if (response.success) {
          this.displaySinglePost(response.data);
        }
      })
      .fail(() => {
        Renderer.hideSinglePostLoader();
      });
  },

  /**
   * Display single post details
   */
  displaySinglePost(post) {
    Renderer.hideSinglePostLoader();

    const $singleHeader = jQuery('#single-post-header');
    if (!$singleHeader.data('instant-rendered')) {
      const catHTML = `
        <div class="header-archive">
          <div class="header-archive-inr">
            <div class="header-controls">
              ${renderIconButton({
                className: 'back-btn cat',
                ariaLabel: 'Tillbaka till kategori',
                imgSrc: '/wp-content/uploads/2025/10/back-white.svg',
                imgAlt: 'Tillbaka',
                dataAttrs: { 'cat-slug': post.cat_slug },
              })}
            </div>
            <div class="header-archive-name">
              ${
                post.cat_image
                  ? `<img src="${post.cat_image}" class="category-header-img" />`
                  : ''
              }
              <h3 class="s-cat-name">${post.cat_name}</h3>
            </div>
          </div>
        </div>
      `;
      $singleHeader.removeClass().addClass(post.cat_slug).html(catHTML);
    } else {
      $singleHeader.removeData('instant-rendered');
    }

    const popupHTML = Renderer.renderGroupsSchedulePopup(post.groups_schedule);
    jQuery('#single-post-header').after(popupHTML);

    Renderer.renderSinglePost(post);

    // Update map with single marker (don't recreate map)
    MapManager.addMarkers([post]);
    MapManager.invalidateSize();

    const lat = parseFloat(post.lat);
    const lng = parseFloat(post.long);

    if (lat && lng) {
      setTimeout(() => {
        MapManager.flyTo(lat, lng, 16);
      }, 300);
    }
  },

  /**
   * Handle back button click
   */
  onBackClick() {
    const action = UIStateManager.goBack();

    if (action.action === 'loadCategory') {
      this.loadCategory(action.catId, true);
    } else if (action.action === 'home') {
      this.loadHomepage();
    }
  },

  /**
   * Handle directions click
   */
  onDirectionsClick(e) {
    const destLat = parseFloat(jQuery(e.currentTarget).data('lat'));
    const destLng = parseFloat(jQuery(e.currentTarget).data('lang'));

    if (!this.userLat || !this.userLng) {
      alert('Fetching your location... please try again in a moment.');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&origin=${this.userLat},${this.userLng}&destination=${destLat},${destLng}&travelmode=walking`;
    window.open(url, '_blank');
  },

  /**
   * Handle location info close
   */
  onCloseLocationInfo() {
    UIStateManager.hideLocationInfo();

    if (
      UIStateManager.currentPage === UIStateManager.PAGES.HOME &&
      this.originalHomepageView
    ) {
      MapManager.flyTo(
        this.originalHomepageView.lat,
        this.originalHomepageView.lng,
        this.originalHomepageView.zoom
      );
    }
  },

  /**
   * Handle dropdown toggle
   */
  onDropdownToggle(e) {
    e.preventDefault();
    e.stopPropagation();

    const $dropdown = jQuery(e.currentTarget).closest(
      '.custom-dropdown, .custom-dropdown-single'
    );
    UIStateManager.toggleDropdown($dropdown);
  },

  /**
   * Handle subcategory filter
   */
  onSubcategoryFilter() {
    const selectedIds = [];

    jQuery("#subcategory-container input[type='checkbox']").each(function () {
      if (jQuery(this).is(':checked') && jQuery(this).val() !== '') {
        selectedIds.push(jQuery(this).val());
      }
    });

    if (selectedIds.length === 0) {
      const catId = localStorage.getItem('currentCatId');
      if (catId) {
        this.loadCategory(parseInt(catId), false);
      }
      return;
    }

    Renderer.showCategoryLoader();

    DataFetcher.getSubcategoryPostsMultiple(selectedIds)
      .done((response) => {
        Renderer.hideCategoryLoader();
        if (response.success) {
          Renderer.renderCategoryPosts(
            response.data,
            localStorage.getItem('currentCatId')
          );
          MapManager.addMarkers(response.data);
        }
      })
      .fail(() => {
        Renderer.hideCategoryLoader();
      });
  },

  /**
   * Handle group selection change
   */
  onGroupSelectionChange() {
    const selected = [];
    jQuery('.dropdown-item-single input[type="checkbox"]:checked').each(
      function () {
        const labelText = jQuery(this)
          .siblings('.label-text-single')
          .text()
          .trim();
        selected.push(labelText);
      }
    );

    let buttonText = 'Öppettider för målgrupp';
    if (selected.length > 0) {
      buttonText = 'Öppettider för: ' + selected.join(', ');
    }

    jQuery('.dropdown-toggle-single').html(
      buttonText +
        ' <img src="/wp-content/uploads/2025/10/key_arrow_down.png" class="arrow-single" alt="">'
    );
  },
};

// Initialize on document ready
jQuery(document).ready(function () {
  AppController.init();
});
