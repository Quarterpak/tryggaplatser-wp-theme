/**
 * Frontend Helper Functions - Opening Hours & Utilities
 *
 * Consolidates opening hours calculation, status display, and other
 * utilities used throughout the application to reduce duplication.
 */

// ============================================================================
// OPENING HOURS HELPERS
// ============================================================================

/**
 * Swedish day names mapping
 */
const SWEDISH_DAYS = [
  'Söndag',
  'Måndag',
  'Tisdag',
  'Onsdag',
  'Torsdag',
  'Fredag',
  'Lördag',
];

/**
 * Status text mappings
 */
const STATUS_TEXT_MAP = {
  'open-time': 'Öppet',
  'closing-soon-time': 'Stänger snart',
  'closed-time': 'Stängt',
};

/**
 * Generate status HTML with appropriate class
 *
 * @param {string} type - Status type (open-time, closing-soon-time, closed-time)
 * @param {string} label - Display label
 * @returns {string} HTML string
 */
function makeStatus(type, label) {
  return `
        <span class="${type}">${STATUS_TEXT_MAP[type]}</span>
        <span class="status-time">${label}</span>
    `;
}

/**
 * Calculate and determine today's opening status
 *
 * @param {Array} opening_hours_grouped - Grouped opening hours data
 * @returns {string} HTML for today's status
 */
function calculateTodayStatus(opening_hours_grouped) {
  const todayIndex = new Date().getDay();
  const todayName = SWEDISH_DAYS[todayIndex];

  // Filter only valid rows
  const validRows = opening_hours_grouped.filter(
    (item) =>
      item.hours?.trim() &&
      item.hours.trim() !== '-' &&
      Array.isArray(item.days) &&
      item.days.some((d) => d?.trim())
  );

  // Find row matching today
  const todayRow = validRows.find((r) => r.days.includes(todayName));

  // If today has no hours → find next open day
  if (!todayRow || todayRow.hours === 'Stängt') {
    for (let i = 1; i <= 7; i++) {
      const nextIndex = (todayIndex + i) % 7;
      const nextDay = SWEDISH_DAYS[nextIndex];
      const nextRow = validRows.find(
        (r) => r.days.includes(nextDay) && r.hours !== 'Stängt'
      );

      if (nextRow) {
        const nextOpen = nextRow.hours.split('-')[0].trim();
        return makeStatus('closed-time', `Öppnar ${nextOpen}`);
      }
    }
    return makeStatus('closed-time', 'Stängt');
  }

  // Today is open - parse hours
  const parts = todayRow.hours.split('-').map((h) => h.trim());
  const open = parts[0] ?? null;
  const close = parts[1] ?? null;

  if (!open || !close) {
    return makeStatus('closed-time', 'Stängt');
  }

  const now = new Date();
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);

  const openTime = new Date();
  const closeTime = new Date();

  openTime.setHours(oh, om || 0, 0, 0);
  closeTime.setHours(ch, cm || 0, 0, 0);

  const minsToClose = Math.round((closeTime - now) / 60000);

  if (now < openTime) {
    return makeStatus('closed-time', `Öppnar ${open}`);
  } else if (minsToClose <= 0) {
    return makeStatus('closed-time', `Stängt`);
  } else if (minsToClose <= 30) {
    return makeStatus('closing-soon-time', close);
  } else {
    return makeStatus('open-time', `Stänger ${close}`);
  }
}

/**
 * Format day range (handles both single days and ranges)
 *
 * @param {Array} days - Array of day names
 * @returns {string} Formatted day range
 */
function formatDayRange(days) {
  if (days.length === 1) return days[0];
  return `${days[0]} - ${days[days.length - 1]}`;
}

/**
 * Format hours (e.g., "10:00-18:00" -> "10:00 - 18:00")
 *
 * @param {string} hours - Hours string
 * @returns {string} Formatted hours
 */
function formatHours(hours) {
  if (!hours || hours === 'Stängt') return 'Stängt';
  const [open, close] = hours.split('-').map((h) => h.trim());
  return `${open} - ${close}`;
}

/**
 * Generate complete opening hours HTML grouped by times
 *
 * @param {Array} opening_hours_grouped - Grouped opening hours
 * @returns {string} HTML for all opening hours
 */
function generateOpeningHoursHtml(opening_hours_grouped) {
  let html = '';
  let lastHours = null;
  let groupDays = [];

  function pushGroup() {
    if (!groupDays.length || lastHours === null) return;

    html += `
            <p class="weekday-time time-class">
                <span>${formatDayRange(groupDays)}</span>
                <span>${formatHours(lastHours)}</span>
            </p>
        `;
  }

  // Loop through rows and group consecutive days with same hours
  opening_hours_grouped.forEach((item) => {
    const hours = item.hours;
    const days = item.days;

    if (hours === lastHours) {
      groupDays.push(...days);
    } else {
      pushGroup();
      groupDays = [...days];
      lastHours = hours;
    }
  });

  // Final push
  pushGroup();

  return html;
}

// ============================================================================
// DISTANCE CALCULATION HELPERS
// ============================================================================

const ORS_API_KEY =
  'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjFmYWJhMjY1Zjc3ODQ4ZGI5ZmJmMGRjNjA0MDE0ODkwIiwiaCI6Im11cm11cjY0In0=';

/**
 * Calculate distance using Haversine formula (as fallback)
 *
 * @param {number} lat1, lon1, lat2, lon2 - Coordinates
 * @returns {number} Distance in km
 */
// function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
//     const R = 6371;
//     const dLat = deg2rad(lat2 - lat1);
//     const dLon = deg2rad(lon2 - lon1);
//     const a = Math.sin(dLat / 2) ** 2 +
//               Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     return R * c;
// }

// function deg2rad(deg) {
//     return deg * (Math.PI / 180);
// }

/**
 * Fetch distance and duration from OpenRouteService API
 *
 * @param {number} userLat, userLng - User coordinates
 * @param {number} destLat, destLng - Destination coordinates
 * @param {function} callback - Callback with formatted distance/time string
 */
// function calculateDistanceAndTime(userLat, userLng, destLat, destLng, callback) {
//     if (!userLat || !userLng) {
//         console.warn("User location unavailable");
//         callback("User location unavailable");
//         return;
//     }

//     if (!destLat || !destLng) {
//         console.warn("Destination location unavailable", {destLat, destLng});
//         callback("Destination unavailable");
//         return;
//     }

//     fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
//         method: "POST",
//         headers: {
//             Authorization: ORS_API_KEY,
//             "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//             coordinates: [
//                 [userLng, userLat],
//                 [destLng, destLat]
//             ]
//         })
//     })
//         .then(res => res.json())
//         .then(data => {
//             if (data.features && data.features[0]) {
//                 const summary = data.features[0].properties.summary;
//                 const distanceKm = (summary.distance / 1000).toFixed(2);
//                 const durationMin = Math.ceil(summary.duration / 60);
//                 callback(`${durationMin} min (${distanceKm} km)`);
//             } else {
//                 callback("Distance unavailable");
//             }
//         })
//         .catch(() => callback("Distance unavailable"));
// }

// ============================================================================
// ICON & MARKER HELPERS
// ============================================================================

/**
 * Get custom icon for location based on category
 *
 * @param {string} catSlug - Category slug
 * @returns {L.divIcon} Leaflet icon
 */
function getCustomIcon(catSlug) {
  const defaultIcon = L.divIcon({
    className: `custom-marker ${catSlug}`,
    html: `
<svg width="32" height="46" viewBox="0 0 32 46" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.9998 1.4707C20.0033 1.4707 23.8408 3.0932 26.6687 5.97754C29.4962 8.86164 31.0837 12.7712 31.0837 16.8457C31.0837 19.7339 30.1421 22.9281 28.7625 26.0693C27.38 29.2169 25.5409 32.3474 23.7087 35.1172C21.8756 37.8884 20.0432 40.3079 18.6697 42.0342C17.9828 42.8975 17.4101 43.5881 17.0085 44.0635C16.8078 44.3012 16.6498 44.4855 16.5417 44.6104C16.4877 44.6727 16.4459 44.7207 16.4177 44.7529C16.4038 44.7689 16.3928 44.7808 16.3855 44.7891C16.3819 44.7932 16.3796 44.7967 16.3777 44.7988L16.3748 44.8018L15.9998 45.2246L15.6257 44.8018L15.6228 44.7988C15.6209 44.7967 15.6177 44.7932 15.614 44.7891C15.6067 44.7808 15.5957 44.7689 15.5818 44.7529C15.5536 44.7208 15.5127 44.6727 15.4587 44.6104C15.3507 44.4855 15.1927 44.3012 14.9919 44.0635C14.5904 43.5881 14.0168 42.8976 13.3298 42.0342C11.9563 40.308 10.1247 37.8883 8.29175 35.1172C6.4596 32.3474 4.62052 29.217 3.23804 26.0693C1.85836 22.9281 0.916748 19.7339 0.916748 16.8457C0.916748 12.7712 2.50337 8.86162 5.33081 5.97754C8.15861 3.09318 11.9963 1.47079 15.9998 1.4707ZM15.9998 12.0332C14.7544 12.0333 13.5583 12.5381 12.6746 13.4395C11.7905 14.3412 11.2917 15.5662 11.2917 16.8457C11.2917 18.1252 11.7905 19.3502 12.6746 20.252C13.5583 21.1533 14.7544 21.6581 15.9998 21.6582C16.6167 21.6582 17.2281 21.534 17.7986 21.293C18.3691 21.0519 18.8883 20.6984 19.3259 20.252C19.7636 19.8055 20.111 19.275 20.3484 18.6904C20.5858 18.1058 20.7087 17.479 20.7087 16.8457C20.7087 15.5663 20.21 14.3412 19.3259 13.4395C18.4421 12.538 17.2453 12.0332 15.9998 12.0332Z" fill="#D72C19" stroke="black"/>
</svg>`,
    iconSize: [32, 45],
    iconAnchor: [16, 45],
  });

  const toiletIcon = L.divIcon({
    className: `custom-marker-toilet ${catSlug}`,
    html: `
<svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24.583 3.5293C28.5834 3.5293 32.4203 5.11859 35.249 7.94727C38.0775 10.7758 39.6669 14.6122 39.667 18.6123C39.667 21.4478 38.7247 24.5827 37.3447 27.6631C35.9618 30.75 34.1214 33.8194 32.2891 36.5352C30.4557 39.2524 28.6236 41.6249 27.25 43.3174C26.563 44.1639 25.9904 44.8415 25.5889 45.3076C25.3883 45.5405 25.2301 45.7204 25.1221 45.8428C25.068 45.904 25.0263 45.9509 24.998 45.9824C24.9839 45.9982 24.9731 46.0104 24.9658 46.0186C24.9622 46.0226 24.9589 46.0252 24.957 46.0273C24.9561 46.0284 24.9556 46.0297 24.9551 46.0303V46.0312L24.583 45.6963L24.9541 46.0312L24.583 46.4424L24.2119 46.0312L24.2109 46.0303C24.2104 46.0297 24.2099 46.0283 24.209 46.0273C24.2071 46.0253 24.2046 46.0223 24.2012 46.0186C24.1939 46.0104 24.183 45.9981 24.1689 45.9824C24.1407 45.9509 24.099 45.904 24.0449 45.8428C23.9369 45.7205 23.7787 45.5405 23.5781 45.3076C23.1766 44.8415 22.6031 44.1639 21.916 43.3174C20.5424 41.6249 18.7102 39.2523 16.877 36.5352C15.0447 33.8194 13.2052 30.7499 11.8223 27.6631C10.4422 24.5827 9.5 21.4478 9.5 18.6123C9.50009 14.6121 11.0894 10.7759 13.918 7.94727C16.7466 5.11867 20.5828 3.52938 24.583 3.5293Z" fill="#C7C7C7" stroke="black"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M25.3517 30.3861C25.3623 30.3861 25.3728 30.386 25.3833 30.386C25.3864 30.3859 25.3894 30.386 25.3925 30.386C25.4048 30.3859 25.417 30.3858 25.4292 30.3858L25.3925 30.386H25.3833L25.3517 30.3861Z" fill="#171717"/>
<rect x="18" y="13.0293" width="4.33846" height="9.4" rx="1" fill="#171717"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M18 23.1523H24.1462H26.3154H32.4615C32.4615 25.0162 30.6538 26.7677 28.3038 27.3749C28.3038 27.3749 27.4 27.4908 27.4 28.2379C27.4 28.937 28.4048 29.6984 29.2299 30.0216C29.8047 30.2466 30.2923 31.3908 30.2923 31.8293H28.3038H26.3154H24.1462H20.1692C20.1692 31.3908 20.6568 30.2466 21.2316 30.0216C22.0567 29.6984 23.0615 28.937 23.0615 28.2379C23.0615 27.5388 22.3385 27.3749 22.3385 27.3749C19.7734 26.625 18 25.0162 18 23.1523Z" fill="#171717"/>
<path d="M23.0615 22.4293C23.0615 21.6306 23.709 20.9832 24.5077 20.9832H31.0154C31.8141 20.9832 32.4615 21.6306 32.4615 22.4293H23.0615Z" fill="#171717"/>
</svg>`,
    iconSize: [32, 45],
    iconAnchor: [16, 45],
  });

  return catSlug === 'hygien' ? toiletIcon : defaultIcon;
}

/**
 * Render an accessible icon button
 *
 * @param {Object} config - Button configuration
 * @returns {string} HTML string
 */
function renderIconButton(config) {
  const { className, ariaLabel, imgSrc, imgAlt = '', dataAttrs = {} } = config;

  const dataHtml = Object.entries(dataAttrs)
    .map(([key, value]) => `data-${key}="${value}"`)
    .join('');

  return `
<button
  type="button"
  class="${className}"
  aria-label="${ariaLabel}"
  style="background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"
  ${dataHtml}
>
  <img src="${imgSrc}" alt="${imgAlt}" />
</button>
`;
}

// ============================================================================
// DOM UTILITY HELPERS
// ============================================================================

/**
 * Generate facilities repeater HTML
 *
 * @param {Array} repeaterData - Facilities array
 * @returns {string} HTML
 */
function generateFacilitiesHtml(repeaterData) {
  if (!repeaterData || repeaterData.length === 0) {
    return '';
  }

  let html = '<div class="post-facilities">';
  repeaterData.forEach((f) => {
    if (f.facilitity_image.url) {
      html += `<img src="${f.facilitity_image.url}" class="facility-image" />`;
    }
  });
  html += '</div>';

  return html;
}

/**
 * Generate facilities section HTML with descriptions
 *
 * @param {Array} repeaterData - Facilities array
 * @returns {string} HTML
 */
function generateFacilitiesSectionHtml(repeaterData) {
  if (!repeaterData || repeaterData.length === 0) {
    return '';
  }

  let html = '<div class="facilities-section">';
  repeaterData.forEach((f) => {
    html += '<div class="post-feature">';
    if (f.facilitity_image.url) {
      html += `<img src="${f.facilitity_image.url}" class="facility-image" />`;
    }
    html += `<p>${f.facilitity_text || ''}</p>`;
    html += '</div>';
  });
  html += '</div>';

  return html;
}

/**
 * Detect if device is mobile
 *
 * @returns {boolean}
 */
function isMobileDevice() {
  return window.matchMedia('(max-width: 768px)').matches;
}
