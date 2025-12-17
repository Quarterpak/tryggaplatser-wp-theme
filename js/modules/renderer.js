/**
 * Rendering Module
 *
 * Handles all HTML generation and DOM manipulation.
 * Separates markup generation from business logic.
 */

const Renderer = {
  /**
   * Render category posts list
   *
   * @param {Array} posts - Array of post objects
   * @param {number} catId - Category ID
   */
  renderCategoryPosts(posts, catId) {
    let html = '';

    posts.forEach((post) => {
      const todayStatus = calculateTodayStatus(post.opening_hours_grouped);
      const repeaterHTML = generateFacilitiesHtml(post.repeater_data);
      const distanceClass = `distance-${post.id}`;

      html += `
                <a href="#" class="category_card_link" 
                   data-cat-id="${catId}" 
                   data-post-id="${post.id}" 
                   data-cat-slug="${post.cat_slug || ''}" 
                   data-cat-name="${post.cat_name || ''}" 
                   data-cat-image="${post.cat_image || ''}" 
                   data-post-image="${post.image || ''}" 
                   data-post-title="${post.title || ''}"
                   data-lat="${post.lat}" data-lng="${post.long}">
                    <div class="category_card">
                        <img src="${
                          post.image
                            ? post.image
                            : '/wp-content/uploads/2025/10/SSM_png-2.svg'
                        }" class="post-listing-img">
                        <h3>${post.title}</h3>
                        <p class="category_address_details">${
                          post.street_name
                        }</p>
                        <p class="category_open_data">${todayStatus}</p>
                        ${repeaterHTML}
                        <div class="card-chevron-wrapper">
                            <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M9 6l6 6-6 6"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                </a>
            `;
    });

    jQuery('#category-posts').html(html);
  },

  /**
   * Render category header
   *
   * @param {Object} category - Category data
   */
  renderCategoryHeader(category) {
    const catHTML = `
            <div class="header-archive">
                <div class="header-archive-inr">
                    <div class="header-controls">
                        ${renderIconButton({
                          className: 'back-btn cat',
                          ariaLabel: 'Tillbaka till startsidan',
                          imgSrc: '/wp-content/uploads/2025/12/close.png',
                          imgAlt: 'Tillbaka',
                          dataAttrs: { 'cat-slug': category.cat_slug },
                        })}
                    </div>
                    <div class="header-archive-name">
                        ${
                          category.cat_image
                            ? `<img src="${category.cat_image}" class="category-header-img" />`
                            : ''
                        }
                        <h3 class="s-cat-name">${category.cat_name}</h3>
                    </div>
                </div>
            </div>
        `;

    jQuery('#category-header').addClass(category.cat_slug);
    jQuery('#category-header').html(catHTML);
  },

  /**
   * Render category header instantly from data attributes (without waiting for AJAX)
   * Used to show header immediately when category is clicked
   *
   * @param {Object} category - Category data from link attributes
   */
  renderCategoryHeaderInstant(category) {
    const catHTML = `
            <div class="header-archive">
                <div class="header-archive-inr">
                    <div class="header-controls">
                        ${renderIconButton({
                          className: 'back-btn cat',
                          ariaLabel: 'Tillbaka till startsidan',
                          imgSrc: '/wp-content/uploads/2025/12/close.png',
                          imgAlt: 'Tillbaka',
                          dataAttrs: { 'cat-slug': category.cat_slug },
                        })}
                    </div>
                    <div class="header-archive-name">
                        ${
                          category.cat_image
                            ? `<img src="${category.cat_image}" class="category-header-img" loading="eager" decoding="sync" />`
                            : ''
                        }
                        <h3 class="s-cat-name">${category.cat_name}</h3>
                    </div>
                </div>
            </div>
        `;

    jQuery('#category-header')
      .removeClass()
      .addClass(category.cat_slug)
      .html(catHTML);
  },

  /**
   * Render single post header instantly from link attributes (without waiting for AJAX)
   * Marks the header as 'instant-rendered' to avoid being overwritten by AJAX
   *
   * @param {Object} data - Data from link attributes
   */
  renderSingleHeaderInstant(data) {
    const singleHeaderHTML = `
            <div class="header-archive">
                <div class="header-archive-inr">
                    <div class="header-controls">
                        ${renderIconButton({
                          className: 'back-btn cat',
                          ariaLabel: 'Tillbaka till startsidan',
                          imgSrc: '/wp-content/uploads/2025/12/close.png',
                          imgAlt: 'Tillbaka',
                          dataAttrs: { 'cat-slug': data.cat_slug },
                        })}
                    </div>
                    <div class="header-archive-name">
                        ${
                          data.cat_image
                            ? `<img src="${data.cat_image}" class="category-header-img" loading="eager" decoding="sync" />`
                            : ''
                        }
                        <h3 class="s-cat-name">${data.cat_name}</h3>
                    </div>
                </div>
            </div>
        `;

    const $header = jQuery('#single-post-header');
    $header
      .removeClass()
      .addClass(data.cat_slug || '')
      .html(singleHeaderHTML);
    // mark so AJAX won't override
    $header.data('instant-rendered', true);
  },

  /**
   * Render subcategories dropdown
   *
   * @param {Array} subcategories - Subcategory items
   */
  renderSubcategoryDropdown(subcategories) {
    jQuery('#subcategory-container').remove();

    if (!subcategories || subcategories.length === 0) return;

    const dropdownHTML = `
            <div class="filter-wrap">
                <div id="subcategory-container" class="custom-dropdown">
                    <button class="dropdown-toggle">Kategori
                        <img src="/wp-content/uploads/2025/10/key_arrow_down.png" class="arrow" alt="">
                    </button>
                    <div class="dropdown-menu">
                        ${subcategories
                          .map(
                            (s) => `
                            <label class="dropdown-item">
                                <input type="checkbox" value="${s.id}">
                                <span class="checkbox"></span>
                                <span class="label-text">${s.name}</span>
                            </label>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            </div>
        `;

    jQuery('#category-header').after(dropdownHTML);
  },

  /**
   * Render single post page
   *
   * @param {Object} post - Post data
   */
  renderSinglePost(post) {
    const todayStatus = calculateTodayStatus(post.opening_hours_grouped);
    const openingHoursHtml = generateOpeningHoursHtml(
      post.opening_hours_grouped
    );
    const repeaterHTML = generateFacilitiesSectionHtml(post.repeater_data);

    const html = `
            <div class="single-post-details">
                <div class="post-header-content">
                    <img src="${
                      post.image
                        ? post.image
                        : 'https://tryggaplatser.nu/wp-content/uploads/2025/10/SSM_single_png.svg'
                    }"
                         alt="Service logotyp"
                         class="bo-logo">
                    <h1>${post.title}</h1>
                    <h2 class="single-address-data">${post.address}</h2>
                </div>

                <div class="post-content">${post.content}</div>

                <div class="bo-contact">
                    ${
                      post.service_link
                        ? `
                        <a class="bo-btn" href="${post.service_link}" target="_blank">
                            <img src="/wp-content/uploads/2025/10/language.svg" alt="Website">
                            <span>Hemsida</span>
                        </a>
                    `
                        : ''
                    }
                    <a class="bo-btn bo-btn-direction" data-lat="${
                      post.lat
                    }" data-lang="${post.long}">
                        <img src="/wp-content/uploads/2025/10/directions-1.svg" alt="Directions">
                        <span>Vägbeskrivning</span>
                    </a>
                </div>

                ${
                  todayStatus
                    ? `
                    <div class="post-contact-details">
                        <img src="/wp-content/uploads/2025/10/schedule.svg" alt="">
                        <div class="post-content-data">
                            <p class="category_open">${todayStatus}</p>
                            ${openingHoursHtml}
                        </div>
                    </div>
                `
                    : ''
                }

                ${repeaterHTML}

                ${
                  post.service_category_html
                    ? `
                    <div class="service-tags">
                        <p class="service-tagp-heading">Denna plats är ämnad för:</p>
                        ${post.service_category_html}
                    </div>
                `
                    : ''
                }
            </div>
        `;

    const singleViewHTML = `
            <div class="post-header-content">
                <img src="${
                  post.image
                    ? post.image
                    : 'https://tryggaplatser.nu/wp-content/uploads/2025/10/SSM_single_png.svg'
                }"
                      alt="Service logotyp"
                      class="bo-logo">
                <h1>${post.title}</h1>
                <h2 class="single-address-data">${post.address}</h2>
            </div>

            <div class="post-content">${post.content}</div>

            <div class="bo-contact">
                ${
                  post.service_link
                    ? `
                    <a class="bo-btn" href="${post.service_link}" target="_blank">
                        <img src="/wp-content/uploads/2025/10/language.svg" alt="Website">
                        <span>Hemsida</span>
                    </a>
                `
                    : ''
                }
                <a class="bo-btn bo-btn-direction" data-lat="${
                  post.lat
                }" data-lang="${post.long}">
                    <img src="/wp-content/uploads/2025/10/directions-1.svg" alt="Directions">
                    <span>Vägbeskrivning</span>
                </a>
            </div>

            ${
              todayStatus
                ? `
                <div class="post-contact-details">
                    <img src="/wp-content/uploads/2025/10/schedule.svg" alt="">
                    <div class="post-content-data">
                        <p class="category_open">${todayStatus}</p>
                        ${openingHoursHtml}
                    </div>
                </div>
            `
                : ''
            }

            ${repeaterHTML}

            ${
              post.service_category_html
                ? `
                <div class="service-tags">
                    <p class="service-tagp-heading">Denna plats är ämnad för:</p>
                    ${post.service_category_html}
                </div>
            `
                : ''
            }
    `;

    jQuery('#single-posts').html(singleViewHTML);
  },

  /**
   * Render groups schedule popup
   *
   * @param {Array} groupsSchedule - Groups schedule array
   * @returns {string} HTML
   */
  renderGroupsSchedulePopup(groupsSchedule) {
    if (!groupsSchedule || groupsSchedule.length === 0) {
      return '';
    }

    let html = `<div class="time-overlay" style="display:none;">
            <div class="group-popup">
                <div class="group-popup-header">
                    <h2>Öppettider för olika målgrupper</h2>
                    <button class="group-popup-close">
                        <img src="/wp-content/uploads/2025/10/close-blue.svg" alt="Close" />
                    </button>
                </div>
                <div class="group-popup-content">`;

    groupsSchedule.forEach((group) => {
      html += `<div class="group">`;
      html += `<h3>${group.group_name}</h3>`;
      group.opening_days.forEach((day) => {
        html += `<p>${day.day}<span>${day.open} - ${day.close}</span></p>`;
      });
      html += `</div>`;
    });

    html += `</div></div></div>`;

    return html;
  },

  /**
   * Update distance display for a location
   *
   * @param {number} postId - Post ID
   * @param {string} distanceText - Distance/time text
   */
  // updateDistance(postId, distanceText) {
  //     jQuery(`#distance-${postId}`).html(
  //         `<img src='/wp-content/uploads/2025/10/directions_walk.svg' alt='walking-icon'/>
  //          <span>${distanceText}</span>`
  //     );
  // },

  /**
   * Update single post distance
   *
   * @param {string} distanceText - Distance/time text
   */
  // updateSingleDistance(distanceText) {
  //     jQuery('.single-address-type').html(
  //         `<img src='/wp-content/uploads/2025/10/directions_walk.svg' alt='walking-icon'/>
  //          <span>${distanceText}</span>`
  //     );
  // },

  /**
   * Render location info popup (marker click info)
   *
   * @param {Object} location - Location data
   */
  renderLocationInfoPopup(location) {
    const todayStatus = calculateTodayStatus(location.opening_hours_grouped);
    const repeaterHTML = generateFacilitiesHtml(location.repeater_data);

    let featureSrc =
      location.image || '/wp-content/uploads/2025/10/SSM_png_search.svg';
    let newSrc = '/wp-content/uploads/2025/10/restaurant.svg';

    if (location.cat_slug === 'mat-gemenskap') {
      newSrc = '/wp-content/uploads/2025/09/restaurant.svg';
    } else if (location.cat_slug === 'hygien') {
      newSrc = '/wp-content/uploads/2025/10/restaurant-3.svg';
    } else if (location.cat_slug === 'stod-vagledning') {
      newSrc = '/wp-content/uploads/2025/10/restaurant-4.svg';
    } else if (location.cat_slug === 'sang-vila') {
      newSrc = '/wp-content/uploads/2025/10/restaurant-2.svg';
    }

    jQuery('.main-img-logo').show();
    jQuery('.main-img-logo img').attr('src', featureSrc);
    jQuery('.location-info-content').html(`<p>${location.title}</p>`);
    jQuery('.location-info-image img').attr('src', newSrc);
    jQuery('.opening-time').html(todayStatus);
    jQuery('.location-street').html(location.address);
    jQuery('.facility-area').html(repeaterHTML);

    const readMoreHtml =
      location.cat_slug === 'hygien'
        ? ''
        : `<a href="#" 
                    class="read-more-link" 
                    data-post-id="${location.id}"
                    data-cat-id="${location.cat_id || ''}"
                    data-cat-slug="${location.cat_slug || ''}"
                    data-cat-name="${location.cat_name || ''}"
                    data-cat-image="${location.cat_image || ''}"
                    data-post-image="${location.image || ''}"
                >Läs Mer</a>`;

    jQuery('.location-info-btns').html(
      readMoreHtml +
        `<a href="#" data-lat="${location.lat}" data-lang="${location.lng}" class="btn_icon">
                <img src="/wp-content/uploads/2025/10/directions-1.svg" alt="Directions">
                <span>Vägbeskrivning</span>
            </a>`
    );

    jQuery('.btn_icon')
      .attr('data-lat', location.lat)
      .attr('data-lang', location.lng);
  },

  /**
   * Show loader in category posts area
   */
  showCategoryLoader() {
    const loaderHTML = `
            <div class="category-posts-loader">
                <div class="loader-spinner"></div>
            </div>
        `;
    jQuery('#category-posts').html(loaderHTML);
  },

  /**
   * Hide loader from category posts area
   */
  hideCategoryLoader() {
    jQuery('#category-posts .category-posts-loader').remove();
  },

  /**
   * Show loader in single post area
   */
  showSinglePostLoader() {
    const loaderHTML = `
            <div class="single-post-loader">
                <div class="loader-spinner"></div>
            </div>
        `;
    jQuery('#single-posts').html(loaderHTML);
  },

  /**
   * Hide loader from single post area
   */
  hideSinglePostLoader() {
    jQuery('#single-posts .single-post-loader').remove();
  },
};
