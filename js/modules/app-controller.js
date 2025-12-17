/**
 * Main Application Controller
 *
 * Coordinates all modules and manages the application flow.
 * Uses the modular helpers and managers created for separation of concerns.
 */

const AppController = {
  // Stockholm Central coordinates (fallback when no geolocation)
  STOCKHOLM_CENTRAL_LAT: 59.33024608264878,
  STOCKHOLM_CENTRAL_LNG: 18.058248426091545,

  // Cache user location
  userLat: null,
  userLng: null,

  // Store original map view for homepage reset
  originalHomepageView: null,

  /**
   * Initialize the application
   */
  init() {
    this.setupGeolocation();
    this.setupEventListeners();
    this.initializeHomepage();
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
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
        }
      );
    }
  },

  /**
   * Calculate distance between two points using Haversine formula
   *
   * @param {number} lat1 - First latitude
   * @param {number} lng1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lng2 - Second longitude
   * @returns {number} Distance in kilometers
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
   *
   * @param {Array} locations - Array of location objects with lat/lng or lat/long properties
   * @param {number} refLat - Reference latitude
   * @param {number} refLng - Reference longitude
   * @returns {Object|null} Closest location or null if no locations
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
    // Category navigation
    jQuery(document).on('click', '.service_cat_list_details', (e) =>
      this.onCategoryClick(e)
    );

    // Category link in posts
    jQuery(document).on('click', '.category_card_link, .read-more-link', (e) =>
      this.onPostClick(e)
    );

    // Category card click to center map (when not navigating to single post)
    jQuery(document).on('click', '.category_card', (e) =>
      this.onCategoryCardClick(e)
    );

    // Back button
    jQuery(document).on('click', '.back-btn', () => this.onBackClick());

    // Direction buttons
    jQuery(document).on('click', '.btn_icon, .bo-btn-direction', (e) =>
      this.onDirectionsClick(e)
    );

    // Location info close
    jQuery(document).on(
      'click',
      '.location-info-wrap .close-location, .location-info-wrap .close-icon',
      () => this.onCloseLocationInfo()
    );

    // Menu toggle
    jQuery(document).on('click', '.header-controls .open-menu-cat', () =>
      UIStateManager.toggleMenu('open')
    );

    // Dropdown toggle
    jQuery(document).on(
      'click',
      '.dropdown-toggle, .dropdown-toggle-single',
      (e) => this.onDropdownToggle(e)
    );

    // Subcategory filter
    jQuery(document)
      .off('change', "#subcategory-container input[type='checkbox']")
      .on('change', "#subcategory-container input[type='checkbox']", () =>
        this.onSubcategoryFilter()
      );

    // Group selection filter
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

    // Initialize main map
    const map = MapManager.initMap('main-map');

    // Fetch and display markers
    DataFetcher.getAllLocations()
      .done((response) => {
        if (response.success) {
          this.displayMarkersOnHomepage(response.data);
        }
      })
      .fail(() => {
        map.setView([59.33024608264878, 18.058248426091545], 12);
      });
  },

  /**
   * Display markers on homepage map
   *
   * @param {Array} locations - Location data
   */
  displayMarkersOnHomepage(locations) {
    const mapId = 'main-map';
    const map = MapManager.getMap(mapId);

    if (this.userLat && this.userLng) {
      // With geolocation: center on user's position
      MapManager.addUserMarker(mapId, this.userLat, this.userLng);
      map.setView([this.userLat, this.userLng], 13);
      // Store original view for reset
      this.originalHomepageView = {
        lat: this.userLat,
        lng: this.userLng,
        zoom: 13,
      };
    } else {
      // Without geolocation: center on Stockholm Central
      map.setView([this.STOCKHOLM_CENTRAL_LAT, this.STOCKHOLM_CENTRAL_LNG], 12);
      // Store original view for reset
      this.originalHomepageView = {
        lat: this.STOCKHOLM_CENTRAL_LAT,
        lng: this.STOCKHOLM_CENTRAL_LNG,
        zoom: 12,
      };
    }

    MapManager.addMarkersToMap(mapId, locations, (location) =>
      this.onMarkerClick(location)
    );
  },

  /**
   * Handle marker click on homepage
   *
   * @param {Object} location - Location data
   */
  onMarkerClick(location) {
    // Center map on clicked marker with zoom and animation
    const lat = parseFloat(location.lat);
    const lng = parseFloat(location.lng || location.long);
    if (lat && lng) {
      MapManager.flyTo('main-map', lat, lng, 16);
    }

    UIStateManager.showLocationInfo();
    Renderer.renderLocationInfoPopup(location);

    // if (this.userLat && this.userLng) {

    //                jQuery(".location-distance").html(
    //         `<img src='/wp-content/uploads/2025/10/directions_walk.svg' alt='walking-icon'/>
    //          <span>Calculating...</span>`
    //     );

    //     calculateDistanceAndTime(
    //         this.userLat,
    //         this.userLng,
    //         location.lat,
    //         location.lng,
    //         (result) => {
    //             jQuery(".location-distance").html(
    //                 `<img src='/wp-content/uploads/2025/10/directions_walk.svg' alt='walking-icon'/>
    //                  <span>${result}</span>`
    //             );
    //         }
    //     );
    // } else {
    //     jQuery(".location-distance").html("<p>User location unavailable</p>");
    // }
  },

  /**
   * Handle category click
   *
   * @param {Event} e
   */
  onCategoryClick(e) {
    e.preventDefault();

    const $link = jQuery(e.currentTarget);
    const catId = $link.data('cat-id');

    const catSlug = $link.data('cat-slug');
    const catName = $link.data('cat-name');
    const catImage = $link.data('cat-image');

    // Show category view and category header instantly (don't wait for AJAX)
    UIStateManager.showPage(UIStateManager.PAGES.CATEGORY);

    // Render category header immediately with data from link attributes
    Renderer.renderCategoryHeaderInstant({
      cat_slug: catSlug,
      cat_name: catName,
      cat_image: catImage,
    });

    // Load category posts in background

    this.loadCategory(catId, true);
  },

  /**
   * Load category and its posts
   *
   * @param {number} catId - Category ID
   * @param {boolean} pushHistory - Whether to push browser history
   */
  loadCategory(catId, pushHistory = true) {
    UIStateManager.showPage(UIStateManager.PAGES.CATEGORY);
    UIStateManager.saveState(UIStateManager.PAGES.CATEGORY, { catId });

    if (pushHistory) {
      UIStateManager.pushHistory(UIStateManager.PAGES.CATEGORY, { catId });
    }

    // Show loader
    Renderer.showCategoryLoader();

    // Initialize main map
    const mapId = 'main-map';
    MapManager.initMap(mapId);

    // Clear old markers before loading new ones
    MapManager.clearMarkers(mapId);

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
   *
   * @param {Array} posts - Post array
   * @param {number} catId - Category ID
   */
  displayCategoryPosts(posts, catId) {
    console.log('app-controller - displayCategoryPosts: ', posts);
    // Hide loader
    Renderer.hideCategoryLoader();

    // Render posts
    Renderer.renderCategoryPosts(posts, catId);

    // Render header
    if (posts.length > 0) {
      Renderer.renderCategoryHeader(posts[0]);
    }

    // Clear old markers and add new ones to map
    const mapId = 'main-map';
    MapManager.clearMarkers(mapId);
    MapManager.addMarkersToMap(mapId, posts, (post) => {
      this.movePostToTop(post.id);
    });

    MapManager.invalidateSize(mapId);

    // Add user location marker if available
    if (this.userLat && this.userLng) {
      MapManager.addUserMarker(mapId, this.userLat, this.userLng);
    }

    // Determine centering behavior
    setTimeout(() => {
      if (this.userLat && this.userLng) {
        // With geolocation: center on location closest to user
        const closest = this.findClosestLocation(
          posts,
          this.userLat,
          this.userLng
        );
        if (closest) {
          const closestLat = parseFloat(closest.lat);
          const closestLng = parseFloat(closest.lng || closest.long);
          MapManager.flyTo(mapId, closestLat, closestLng, 13);
        }
      } else {
        // Without geolocation: center on location closest to Stockholm Central
        const closest = this.findClosestLocation(
          posts,
          this.STOCKHOLM_CENTRAL_LAT,
          this.STOCKHOLM_CENTRAL_LNG
        );
        if (closest) {
          const closestLat = parseFloat(closest.lat);
          const closestLng = parseFloat(closest.lng || closest.long);
          MapManager.flyTo(mapId, closestLat, closestLng, 13);
        } else if (posts.length > 0) {
          // Fallback to first location if no closest found
          const firstLat = parseFloat(posts[0].lat);
          const firstLng = parseFloat(posts[0].lng || posts[0].long);
          MapManager.flyTo(mapId, firstLat, firstLng, 13);
        }
      }
    }, 300);

    // Calculate distances if user location available
    // if (this.userLat && this.userLng) {
    //     posts.forEach(post => {
    //         // console.log(post);
    //         this.calculateAndDisplayDistance(
    //             this.userLat,
    //             this.userLng,
    //             post.lat,
    //             post.long,
    //             post.id
    //         );
    //     });
    // }
  },

  /**
   * Load subcategories for current category
   *
   * @param {number} catId - Category ID
   */
  loadCategorySubcategories(catId) {
    DataFetcher.getSubcategoriesByParent(catId).done((response) => {
      if (response.success && response.data.data.length > 0) {
        Renderer.renderSubcategoryDropdown(response.data.data);
      }
    });
  },

  /**
   * Calculate and display distance for a post
   *
   * @param {number} userLat, userLng - User coordinates
   * @param {number} destLat, destLng - Destination coordinates
   * @param {string} pageType - 'category' or 'single' to determine update method
   */
  // calculateAndDisplayDistance(userLat, userLng, destLat, destLng, postId, pageType = 'category') {
  //     if (!userLat || !userLng || !destLat || !destLng) {
  //         console.warn("Missing coordinates for distance calculation", {userLat, userLng, destLat, destLng});
  //         return;
  //     }
  //     calculateDistanceAndTime(userLat, userLng, destLat, destLng, (result) => {
  //         if (pageType === 'single') {
  //             Renderer.updateSingleDistance(result);
  //         } else {
  //             Renderer.updateDistance(postId, result);
  //         }
  //     });
  // },

  /**
   * Move post to top of list (used for map marker click)
   *
   * @param {number} postId - Post ID
   */
  movePostToTop(postId) {
    const listWrapper = document.getElementById('category-posts');
    if (!listWrapper) return;

    const selectedItem = listWrapper.querySelector(
      `[data-post-id="${postId}"]`
    );
    if (!selectedItem) return;

    // Center map on this post with smooth animation
    const lat = parseFloat(selectedItem.dataset.lat);
    const lng = parseFloat(selectedItem.dataset.lng);
    if (lat && lng) {
      MapManager.flyTo('main-map', lat, lng, 16);
    }

    listWrapper.prepend(selectedItem);
    selectedItem.classList.add('selected-highlight');
    setTimeout(() => {
      selectedItem.classList.remove('selected-highlight');
    }, 1500);
  },

  /**
   * Handle category card click to center map
   *
   * @param {Event} e
   */
  onCategoryCardClick(e) {
    // Don't interfere with link navigation
    if (jQuery(e.target).closest('.category_card_link').length) {
      return;
    }

    const $link = jQuery(e.currentTarget).closest('.category_card_link');
    if (!$link.length) return;

    const lat = parseFloat($link.data('lat'));
    const lng = parseFloat($link.data('lng'));

    if (lat && lng) {
      MapManager.flyTo('category-map', lat, lng, 16);

      // Scroll to top to show map better
      const mapElement = document.getElementById('category-map');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  },

  /**
   * Handle post click
   *
   * @param {Event} e
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

    // Show single page immediately and render header from link attributes
    UIStateManager.showPage(UIStateManager.PAGES.SINGLE);
    Renderer.renderSingleHeaderInstant({
      cat_slug: catSlug,
      cat_name: catName,
      cat_image: catImage,
      post_image: postImage,
    });

    // Load single post details in background

    this.loadSinglePost(postId, true, catId);
  },

  /**
   * Load single post page
   *
   * @param {number} postId - Post ID
   * @param {boolean} pushHistory - Whether to push browser history
   * @param {number} catId - Category ID (optional)
   */
  loadSinglePost(postId, pushHistory = true, catId = 0) {
    UIStateManager.showPage(UIStateManager.PAGES.SINGLE);
    UIStateManager.saveState(UIStateManager.PAGES.SINGLE, { postId });

    if (pushHistory) {
      UIStateManager.pushHistory(UIStateManager.PAGES.SINGLE, { postId });
    }

    // Show loader
    Renderer.showSinglePostLoader();

    // Initialize main map
    const mapId = 'main-map';
    MapManager.initMap(mapId);

    // Clear old markers before loading new ones
    MapManager.clearMarkers(mapId);

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
   *
   * @param {Object} post - Post data
   */
  displaySinglePost(post) {
    // Hide loader
    Renderer.hideSinglePostLoader();

    // Render post header only if it wasn't already rendered instantly
    const $singleHeader = jQuery('#single-post-header');
    if (!$singleHeader.data('instant-rendered')) {
      const catHTML = `
                <div class="header-archive">
                    <div class="header-archive-inr">
                        <div class="header-controls">
                            ${renderIconButton({
                              className: 'back-btn cat',
                              ariaLabel: 'Tillbaka till kategori',
                              imgSrc:
                                '/wp-content/uploads/2025/10/back-white.svg',
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
      // Clear the instant-rendered marker so future navigations can update header
      $singleHeader.removeData('instant-rendered');
    }

    // Render groups schedule popup if exists
    const popupHTML = Renderer.renderGroupsSchedulePopup(post.groups_schedule);
    jQuery('#single-post-header').after(popupHTML);

    // Render post content
    Renderer.renderSinglePost(post);

    // Clear old markers and add new map marker
    const mapId = 'main-map';
    MapManager.clearMarkers(mapId);
    MapManager.addMarkersToMap(mapId, [post]);
    MapManager.invalidateSize(mapId);

    // Center map on service location with smooth animation
    const lat = parseFloat(post.lat);
    const lng = parseFloat(post.long);
    if (lat && lng) {
      setTimeout(() => {
        MapManager.flyTo(mapId, lat, lng, 16);
      }, 300);
    }

    // Calculate distance if needed
    // if (this.userLat && this.userLng) {
    //     this.calculateAndDisplayDistance(
    //         this.userLat,
    //         this.userLng,
    //         post.lat,
    //         post.long,
    //         post.id,
    //         'single'
    //     );
    // }
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
   *
   * @param {Event} e
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

    // Reset map to original view if on homepage
    if (
      UIStateManager.currentPage === UIStateManager.PAGES.HOME &&
      this.originalHomepageView
    ) {
      MapManager.flyTo(
        'main-map',
        this.originalHomepageView.lat,
        this.originalHomepageView.lng,
        this.originalHomepageView.zoom
      );
    }
  },

  /**
   * Handle dropdown toggle
   *
   * @param {Event} e
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
      // Reload all posts for current category
      const catId = localStorage.getItem('currentCatId');
      if (catId) {
        this.loadCategory(parseInt(catId), false);
      }
      return;
    }

    // Show loader
    Renderer.showCategoryLoader();

    // Load posts for selected subcategories
    DataFetcher.getSubcategoryPostsMultiple(selectedIds)
      .done((response) => {
        Renderer.hideCategoryLoader();
        if (response.success) {
          const mapId = 'main-map';
          Renderer.renderCategoryPosts(
            response.data,
            localStorage.getItem('currentCatId')
          );
          MapManager.addMarkersToMap(mapId, response.data);
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
