/**
 * Map Management Module
 *
 * Handles all map initialization, configuration, controls, and marker management.
 * Reduces duplication and centralizes map-related logic.
 */

const MapManager = {
  maps: {},
  markers: {},
  userMarkers: {},

  /**
   * Initialize a map with common settings
   *
   * @param {string} containerId - HTML element ID
   * @param {Object} options - Optional map configuration
   * @returns {L.Map} Leaflet map instance
   */
  initMap(containerId, options = {}) {
    if (this.maps[containerId]) {
      return this.maps[containerId];
    }

    const defaultOptions = {
      zoomControl: false,
      center: [59.3293, 18.0686],
      zoom: 13,
      ...options,
    };

    const map = L.map(containerId, {
      zoomControl: defaultOptions.zoomControl,
    }).setView(defaultOptions.center, defaultOptions.zoom);

    // Add zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add locate control
    this.addLocateControl(map);

    // Add tile layer
    this.addTileLayer(map);

    this.maps[containerId] = map;
    return map;
  },

  /**
   * Add locate button control to map
   *
   * @param {L.Map} map
   */
  addLocateControl(map) {
    const locateBtn = L.control({ position: 'bottomright' });

    locateBtn.onAdd = function (map) {
      const div = L.DomUtil.create(
        'div',
        'leaflet-control leaflet-control-custom'
      );
      div.innerHTML = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
<defs>
    <clipPath clipPathUnits="userSpaceOnUse" id="cp1">
        <path d="m35 5v30h-30v-30z"/>
    </clipPath>
</defs>
<style>
    .s0 { fill: #0f1417 } 
</style>
<g>
    <g id="Clip-Path" clip-path="url(#cp1)">
        <g>
            <path fill-rule="evenodd" class="s0" d="m32.87 17.51c0.77 0.27 1.27 1 1.25 1.81-0.01 0.8-0.55 1.51-1.32 1.75l-8.97 2.76-2.76 8.97c-0.23 0.78-0.95 1.32-1.76 1.32h-0.03c-0.8 0.01-1.51-0.49-1.77-1.25l-7.65-20.61q0-0.01 0-0.02c-0.24-0.68-0.06-1.43 0.45-1.93 0.5-0.51 1.25-0.68 1.93-0.45l0.02 0.01 20.61 7.64zm-0.62 1.76h-0.02l-20.6-7.65 7.64 20.61 0.01 0.02 2.76-8.97c0.18-0.59 0.65-1.06 1.24-1.24l8.97-2.76z"/>
        </g>
    </g>
</g>
</svg>`;

      L.DomEvent.disableClickPropagation(div);

      div.onclick = function () {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function (pos) {
              const latlng = [pos.coords.latitude, pos.coords.longitude];
              map.setView(latlng, 15);
            },
            function () {
              alert('Unable to retrieve your location.');
            }
          );
        } else {
          alert('Geolocation is not supported by your browser.');
        }
      };

      return div;
    };

    locateBtn.addTo(map);
  },

  /**
   * Add tile layer to map
   *
   * @param {L.Map} map
   */
  addTileLayer(map) {
    const maptilerKey = 'nyDjavgEFs1USutIvTNH';
    L.tileLayer(
      `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${maptilerKey}`,
      {
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
        tileSize: 512,
        zoomOffset: -1,
      }
    ).addTo(map);
  },

  /**
   * Add user location marker
   *
   * @param {string} mapId - Map container ID
   * @param {number} lat
   * @param {number} lng
   * @returns {L.Marker} User marker
   */
  addUserMarker(mapId, lat, lng) {
    const map = this.maps[mapId];
    if (!map) return null;

    // Remove existing user marker
    if (this.userMarkers[mapId]) {
      map.removeLayer(this.userMarkers[mapId]);
    }

    const userIcon = L.icon({
      iconUrl: '/wp-content/uploads/2025/10/user-location.svg',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    const marker = L.marker([lat, lng], { icon: userIcon })
      .bindPopup('<b>You are here!</b>')
      .addTo(map);

    this.userMarkers[mapId] = marker;
    return marker;
  },

  /**
   * Clear all markers from a map
   *
   * @param {string} mapId - Map container ID
   */
  clearMarkers(mapId) {
    if (!this.markers[mapId]) {
      this.markers[mapId] = [];
    }

    this.markers[mapId].forEach((m) => {
      const map = this.maps[mapId];
      if (map) map.removeLayer(m);
    });

    this.markers[mapId] = [];
  },

  /**
   * Add markers to map layer group
   *
   * @param {string} mapId - Map container ID
   * @param {Array} locations - Location data
   * @param {function} onMarkerClick - Click handler callback
   * @returns {L.LayerGroup}
   */
  addMarkersToMap(mapId, locations, onMarkerClick) {
    const map = this.maps[mapId];
    if (!map) return null;

    if (!this.markers[mapId]) {
      this.markers[mapId] = [];
    }

    let markersLayer;
    if (this.markers[mapId].length > 0) {
      this.clearMarkers(mapId);
    }

    locations.forEach((loc) => {
      const lat = parseFloat(loc.lat);
      const lng = parseFloat(loc.lng || loc.long);

      if (lat && lng) {
        const icon = getCustomIcon(loc.cat_slug);

        const marker = L.marker([lat, lng], { icon }).addTo(map);

        if (onMarkerClick) {
          marker.on('click', function () {
            onMarkerClick(loc);
          });
        }

        this.markers[mapId].push(marker);
      }
    });

    return this.markers[mapId];
  },

  /**
   * Fit map bounds to locations
   *
   * @param {string} mapId - Map container ID
   * @param {Array} bounds - Array of [lat, lng] pairs
   * @param {boolean} animate - Whether to animate the transition
   */
  fitBounds(mapId, bounds, animate = false) {
    const map = this.maps[mapId];
    if (!map || bounds.length === 0) return;

    const latLngBounds = L.latLngBounds(bounds);
    if (latLngBounds.isValid()) {
      if (animate) {
        map.flyToBounds(latLngBounds, {
          padding: [50, 50],
          duration: 1.5,
          easeLinearity: 0.25,
        });
      } else {
        map.fitBounds(latLngBounds, { padding: [50, 50] });
      }
    }
  },

  /**
   * Smoothly fly to bounds with animation
   * Only animates to markers that have valid coordinates
   * Skips animation if markers are very close together (within 500m)
   *
   * @param {string} mapId - Map container ID
   * @param {Array} locations - Array of location objects with lat/lng
   * @param {Object} userLocation - Optional user location {lat, lng} to include in bounds
   */
  flyToBounds(mapId, locations, userLocation = null) {
    const map = this.maps[mapId];
    if (!map || !locations || locations.length === 0) return;

    // Filter to only valid locations with coordinates
    const validBounds = locations
      .map((loc) => {
        const lat = parseFloat(loc.lat);
        const lng = parseFloat(loc.lng || loc.long);
        // Only include if both coordinates are valid numbers
        return lat && lng && !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
      })
      .filter((coord) => coord !== null);

    // Add user location to bounds if provided
    if (userLocation && userLocation.lat && userLocation.lng) {
      validBounds.push([userLocation.lat, userLocation.lng]);
    }

    // Only animate if we have valid markers
    if (validBounds.length === 0) return;

    const latLngBounds = L.latLngBounds(validBounds);
    if (!latLngBounds.isValid()) return;

    // Check if markers are nearby (within ~500m - about 0.005 degrees)
    const ne = latLngBounds.getNorthEast();
    const sw = latLngBounds.getSouthWest();
    const latDiff = Math.abs(ne.lat - sw.lat);
    const lngDiff = Math.abs(ne.lng - sw.lng);
    const areNearby = latDiff < 0.005 && lngDiff < 0.005;

    // If only one marker, use flyTo with specific zoom
    if (validBounds.length === 1) {
      map.flyTo(validBounds[0], 16, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    } else if (areNearby) {
      // Markers are nearby - just center without animation
      const center = latLngBounds.getCenter();
      map.setView(center, 15);
    } else {
      // Multiple markers spread out - animate to fit all in view
      map.flyToBounds(latLngBounds, {
        padding: [80, 80],
        duration: 1.5,
        easeLinearity: 0.25,
        maxZoom: 15,
      });
    }
  },

  /**
   * Set map view to center and zoom level
   *
   * @param {string} mapId - Map container ID
   * @param {number} lat
   * @param {number} lng
   * @param {number} zoom
   * @param {boolean} animate - Whether to animate the transition
   */
  setView(mapId, lat, lng, zoom = 13, animate = false) {
    const map = this.maps[mapId];
    if (map) {
      if (animate) {
        map.flyTo([lat, lng], zoom, {
          duration: 1.5,
          easeLinearity: 0.25,
        });
      } else {
        map.setView([lat, lng], zoom);
      }
    }
  },

  /**
   * Smoothly fly to a location with animation
   * Skips animation if marker is already centered
   *
   * @param {string} mapId - Map container ID
   * @param {number} lat
   * @param {number} lng
   * @param {number} zoom - Zoom level (default 16 for closer view)
   */
  flyTo(mapId, lat, lng, zoom = 16) {
    const map = this.maps[mapId];
    if (!map) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    // Check if marker is already centered (within small threshold ~50m)
    const latDiff = Math.abs(currentCenter.lat - lat);
    const lngDiff = Math.abs(currentCenter.lng - lng);
    const isAlreadyCentered =
      latDiff < 0.0005 && lngDiff < 0.0005 && Math.abs(currentZoom - zoom) < 1;

    if (isAlreadyCentered) {
      // Already centered, no animation needed
      return;
    }

    // Animate to new position
    map.flyTo([lat, lng], zoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  },

  /**
   * Refresh map size (useful after DOM changes)
   *
   * @param {string} mapId - Map container ID
   */
  invalidateSize(mapId) {
    const map = this.maps[mapId];
    if (map) {
      setTimeout(() => map.invalidateSize(), 200);
    }
  },

  /**
   * Get map instance
   *
   * @param {string} mapId - Map container ID
   * @returns {L.Map|null}
   */
  getMap(mapId) {
    return this.maps[mapId] || null;
  },
};
