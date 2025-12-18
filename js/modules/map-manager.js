/**
 * Map Management Module - Single Map Instance
 *
 * Handles ONE map instance that persists throughout the application.
 * Only updates markers and view, never recreates the map.
 */

const MapManager = {
  map: null,
  markers: [],
  userMarker: null,
  maptilerKey: 'nyDjavgEFs1USutIvTNH',

  /**
   * Initialize the map ONCE on app startup
   * This should only be called once when the app loads
   */
  initMap() {
    if (this.map) {
      console.log('Map already initialized, skipping...');
      return this.map;
    }

    console.log('Initializing map for the first time...');

    // Create map
    this.map = L.map('main-map', {
      zoomControl: false,
    }).setView([59.3293, 18.0686], 13);

    // Add zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Add locate control
    this.addLocateControl();

    // Add tile layer
    this.addTileLayer();

    return this.map;
  },

  /**
   * Add locate button control to map
   */
  addLocateControl() {
    const locateBtn = L.control({ position: 'bottomright' });

    locateBtn.onAdd = (map) => {
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

      div.onclick = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const latlng = [pos.coords.latitude, pos.coords.longitude];
              this.flyTo(latlng[0], latlng[1], 15);
            },
            () => {
              alert('Unable to retrieve your location.');
            }
          );
        } else {
          alert('Geolocation is not supported by your browser.');
        }
      };

      return div;
    };

    locateBtn.addTo(this.map);
  },

  /**
   * Add tile layer to map
   */
  addTileLayer() {
    L.tileLayer(
      `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${this.maptilerKey}`,
      {
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
        tileSize: 512,
        zoomOffset: -1,
      }
    ).addTo(this.map);
  },

  /**
   * Add or update user location marker
   */
  addUserMarker(lat, lng) {
    if (!this.map) return null;

    // Remove existing user marker
    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    const userIcon = L.icon({
      iconUrl: '/wp-content/uploads/2025/10/user-location.svg',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });

    this.userMarker = L.marker([lat, lng], { icon: userIcon })
      .bindPopup('<b>You are here!</b>')
      .addTo(this.map);

    return this.userMarker;
  },

  /**
   * Clear all location markers (NOT the user marker)
   */
  clearMarkers() {
    if (!this.map) return;

    this.markers.forEach((m) => {
      this.map.removeLayer(m);
    });

    this.markers = [];
  },

  /**
   * Add markers to map
   * @param {Array} locations - Location data
   * @param {function} onMarkerClick - Click handler callback
   */
  addMarkers(locations, onMarkerClick) {
    if (!this.map) return;

    // Clear existing location markers
    this.clearMarkers();

    locations.forEach((loc) => {
      const lat = parseFloat(loc.lat);
      const lng = parseFloat(loc.lng || loc.long);

      if (lat && lng) {
        const icon = getCustomIcon(loc.cat_slug);

        const marker = L.marker([lat, lng], { icon }).addTo(this.map);

        if (onMarkerClick) {
          marker.on('click', () => {
            onMarkerClick(loc);
          });
        }

        this.markers.push(marker);
      }
    });
  },

  /**
   * Fit map bounds to locations with animation
   * @param {Array} locations - Array of location objects with lat/lng
   * @param {Object} userLocation - Optional user location {lat, lng}
   */
  flyToBounds(locations, userLocation = null) {
    if (!this.map || !locations || locations.length === 0) return;

    // Filter to only valid locations with coordinates
    const validBounds = locations
      .map((loc) => {
        const lat = parseFloat(loc.lat);
        const lng = parseFloat(loc.lng || loc.long);
        return lat && lng && !isNaN(lat) && !isNaN(lng) ? [lat, lng] : null;
      })
      .filter((coord) => coord !== null);

    // Add user location to bounds if provided
    if (userLocation && userLocation.lat && userLocation.lng) {
      validBounds.push([userLocation.lat, userLocation.lng]);
    }

    if (validBounds.length === 0) return;

    const latLngBounds = L.latLngBounds(validBounds);
    if (!latLngBounds.isValid()) return;

    // Check if markers are nearby (within ~500m)
    const ne = latLngBounds.getNorthEast();
    const sw = latLngBounds.getSouthWest();
    const latDiff = Math.abs(ne.lat - sw.lat);
    const lngDiff = Math.abs(ne.lng - sw.lng);
    const areNearby = latDiff < 0.005 && lngDiff < 0.005;

    // If only one marker, use flyTo
    if (validBounds.length === 1) {
      this.flyTo(validBounds[0][0], validBounds[0][1], 16);
    } else if (areNearby) {
      // Markers are nearby - just center without animation
      const center = latLngBounds.getCenter();
      this.map.setView(center, 15);
    } else {
      // Multiple markers spread out - animate to fit all
      this.map.flyToBounds(latLngBounds, {
        padding: [80, 80],
        duration: 1.5,
        easeLinearity: 0.25,
        maxZoom: 15,
      });
    }
  },

  /**
   * Set map view to center and zoom level
   * @param {number} lat
   * @param {number} lng
   * @param {number} zoom
   * @param {boolean} animate
   */
  setView(lat, lng, zoom = 13, animate = false) {
    if (!this.map) return;

    if (animate) {
      this.map.flyTo([lat, lng], zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    } else {
      this.map.setView([lat, lng], zoom);
    }
  },

  /**
   * Smoothly fly to a location with animation
   * Skips animation if marker is already centered
   */
  flyTo(lat, lng, zoom = 16) {
    if (!this.map) return;

    const currentCenter = this.map.getCenter();
    const currentZoom = this.map.getZoom();

    // Check if already centered (within ~50m)
    const latDiff = Math.abs(currentCenter.lat - lat);
    const lngDiff = Math.abs(currentCenter.lng - lng);
    const isAlreadyCentered =
      latDiff < 0.0005 && lngDiff < 0.0005 && Math.abs(currentZoom - zoom) < 1;

    if (isAlreadyCentered) {
      return;
    }

    // Animate to new position
    this.map.flyTo([lat, lng], zoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  },

  /**
   * Refresh map size (useful after DOM changes)
   */
  invalidateSize() {
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 200);
    }
  },

  /**
   * Get the map instance
   */
  getMap() {
    return this.map;
  },
};
