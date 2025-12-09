<?php

/**
 * Search Functionality with Haversine Distance Calculation
 */

add_action('wp_footer', 'custom_search_js', 20);
function custom_search_js() { ?>
<style>
  #search-map {
      display: none; 
  }
</style>

<script>

// =============================================
// GLOBAL: Calculate Distance using Haversine
// =============================================
// function calculateDistance(userLat, userLng, lat, lng, callback) {
//     if (!userLat || !userLng || !lat || !lng) {
//         callback("Location unavailable");
//         return;
//     }

//     // Haversine formula for great-circle distance
//     const R = 6371; // Earth's radius in km
//     const dLat = (lat - userLat) * Math.PI / 180;
//     const dLng = (lng - userLng) * Math.PI / 180;
//     const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
//               Math.cos(userLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
//               Math.sin(dLng/2) * Math.sin(dLng/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     const distanceKm = (R * c).toFixed(1);
    
//     // Estimate walking time (5 km/h average)
//     const durationMin = Math.ceil((R * c) / 5 * 60);
//     callback(`${durationMin} min (${distanceKm} km)`);
// }

jQuery(document).ready(function($) {
    let userLat, userLng;

    // Get user's geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            window.userLat = userLat;
            window.userLng = userLng;
        });
    }

    // On search result click
    $(document).on('click', '.search-result', function() {
        const postId = $(this).data('postid');
        const lat = parseFloat($(this).data('lat'));
        const lng = parseFloat($(this).data('long'));
        
        function moveMap(lat, lng, zoom = 15) {
            if (typeof map !== "undefined" && map.setView) {
                map.setView([lat, lng], zoom);
            }
        }
        moveMap(lat, lng);

        $('#search-map').addClass('search-media-map');
        $('.close-location').addClass('close-compact');
        $('.search-wrapper').removeClass('compact');
        $('.search-data').hide();
        $('.menu-head-wrap').hide();
        $(".location-info-wrap").fadeIn();
        $(".location-info-content").html("<p>Loading...</p>");
        $(".facility-area").html("");
        $(".opening-time").html("");
        // $(".location-distance").html("<p>Calculating...</p>");

        // AJAX: fetch all dynamic data from WordPress
        $.ajax({
            url: '<?php echo admin_url("admin-ajax.php"); ?>',
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'get_location_details',
                post_id: postId
            },
            success: function(post) {
                if (!post || !post.data) return;

                let repeaterSingleHTML = '';
                let readMoreHtml = '';
                let featureSrc = '';

                if (post.data.repeater_data && post.data.repeater_data.length) {
                    repeaterSingleHTML = '<div class="post-facilities">';
                    post.data.repeater_data.forEach(f => {
                        repeaterSingleHTML += `<img src="${f.facilitity_image.url}" class="facility-image" />`;
                    });
                    repeaterSingleHTML += '</div>';
                }

                // Get today's status
                let todayStatusHtml = "";
                const swedishDays = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
                const todayIndex = new Date().getDay();
                const todayName = swedishDays[todayIndex];

                const statusTextMap = {
                    "open-time": "Öppet",
                    "closing-soon-time": "Stänger snart",
                    "closed-time": "Stängt"
                };

                const validRows = post.data.opening_hours_grouped.filter(item =>
                    item.hours?.trim() &&
                    item.hours.trim() !== "-" &&
                    Array.isArray(item.days) &&
                    item.days.some(d => d?.trim())
                );

                const todayRow = validRows.find(r => r.days.includes(todayName));

                function makeStatus(type, label) {
                    return `<span class="${type}">${statusTextMap[type]}</span><span class="status-time">${label}</span>`;
                }

                if (!todayRow || todayRow.hours === "Closed") {
                    for (let i = 1; i <= 7; i++) {
                        const nextIndex = (todayIndex + i) % 7;
                        const nextDay = swedishDays[nextIndex];
                        const nextRow = validRows.find(r => r.days.includes(nextDay) && r.hours !== "Closed");

                        if (nextRow) {
                            const nextOpen = nextRow.hours.split("-")[0].trim();
                            todayStatusHtml = makeStatus("closed-time", `Öppnar ${nextOpen}`);
                            break;
                        }
                    }
                } else {
                    const [open, close] = todayRow.hours.split("-").map(h => h.trim());
                    const now = new Date();
                    const [oh, om] = open.split(":");
                    const [ch, cm] = close.split(":");

                    const openTime = new Date();
                    const closeTime = new Date();
                    openTime.setHours(Number(oh), Number(om), 0, 0);
                    closeTime.setHours(Number(ch), Number(cm), 0, 0);

                    const minsToClose = Math.round((closeTime - now) / 60000);

                    if (now < openTime) {
                        todayStatusHtml = makeStatus("closed-time", `Öppnar ${open}`);
                    } else if (minsToClose <= 0) {
                        for (let i = 1; i <= 7; i++) {
                            const nextIndex = (todayIndex + i) % 7;
                            const nextDay = swedishDays[nextIndex];
                            const nextRow = validRows.find(r => r.days.includes(nextDay) && r.hours !== "Closed");
                            if (nextRow) {
                                const nextOpen = nextRow.hours.split("-")[0].trim();
                                todayStatusHtml = makeStatus("closed-time", `Öppnar ${nextOpen}`);
                                break;
                            }
                        }
                    } else if (minsToClose <= 30) {
                        todayStatusHtml = makeStatus("closing-soon-time", close);
                    } else {
                        todayStatusHtml = makeStatus("open-time", `Stänger ${close}`);
                    }
                }

                featureSrc = post.data.image || "/wp-content/uploads/2025/10/SSM_png_search.svg";

                $(".main-img-logo").show();
                $(".main-img-logo img").attr('src', featureSrc);
                $(".location-info-content").html("<p>" + post.data.title + "</p>");

                if (post.data.cat_slug == "hygien") {
                    readMoreHtml = "";
                } else {
                    readMoreHtml = `<a href="#" data-post-id="${postId}" class="read-more-link">Läs Mer</a>`;
                }

                $(".opening-time").html(todayStatusHtml);
                $(".location-street").html(post.data.address);
                $(".facility-area").html(repeaterSingleHTML);
                $(".location-info-btns").html(`
                    ${readMoreHtml}
                    <a href="#" data-lat="${lat}" data-lang="${lng}" class="btn_icon">
                        <img src="/wp-content/uploads/2025/10/directions-1.svg" alt="Karta ikon"><span>Vägbeskrivning</span>
                    </a>
                `);

                // Calculate distance using Haversine
                // if (userLat && userLng) {
                //     calculateDistance(userLat, userLng, lat, lng, function(result) {
                //         $(".location-distance").html(`
                //             <img src='/wp-content/uploads/2025/10/directions_walk.svg' style='width:16px;margin-right:4px;'> ${result}
                //         `);
                //     });
                // } else {
                //     $(".location-distance").html("<p>User location unavailable</p>");
                // }

                if (typeof map !== 'undefined' && map.setView) {
                    map.setView([lat, lng], 15);
                }
            },
            error: function() {
                $(".location-info-content").html("<p>Failed to load data.</p>");
            }
        });
    });
});

jQuery(document).ready(function($) {
    const maptilerKey = "KUDg6K1DlfDHGdStiaqM";

 let searchMap;
    let searchMarkers;
    let userLat = null;
    let userLng = null;
    let userMarker = null;

    function getOpenStatusHomepage(openTime, closeTime) {
        if (!openTime || !closeTime) return '';
        const now = new Date();
        const [openHour, openMin] = openTime.split(':').map(Number);
        const [closeHour, closeMin] = closeTime.split(':').map(Number);

        const openDate = new Date();
        openDate.setHours(openHour, openMin, 0);
        const closeDate = new Date();
        closeDate.setHours(closeHour, closeMin, 0);

        if (closeDate <= openDate) closeDate.setDate(closeDate.getDate() + 1);
        const closeSoonTime = new Date(closeDate.getTime() - 30*60*1000);

        if (now < openDate) {
            return `<span class="closed-time">Stängt</span> <span class="status-time">öppnar ${openTime}</span>`;
        } else if (now >= openDate && now < closeSoonTime) {
            return `<span class="open-time">Öppet</span> <span class="status-time">Stänger ${closeTime}</span>`;
        } else if (now >= closeSoonTime && now < closeDate) {
            return `<span class="closing-soon-time">Stänger snart</span> <span class="status-time">${closeTime}</span>`;
        } else {
            return `<span class="closed-time">Stängt</span> <span class="status-time">öppnar ${openTime}</span>`;
        }
    }

    function initSearchMap() {
        if (!searchMap) {
            searchMap = L.map('search-map', { zoomControl: false }).setView([20.5937, 78.9629], 5);
            L.control.zoom({ position: 'bottomright' }).addTo(searchMap);

            L.Control.Locate = L.Control.extend({
                onAdd: function(searchMap) {
                    var container = L.DomUtil.create('div', 'leaflet-control leaflet-control-custom locate-control');
                    container.title = 'Go to my location';
                    container.innerHTML = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
                        <style>.s0 { fill: #0f1417 }</style>
                        <g id="Clip-Path">
                            <path fill-rule="evenodd" class="s0" d="m32.87 17.51c0.77 0.27 1.27 1 1.25 1.81-0.01 0.8-0.55 1.51-1.32 1.75l-8.97 2.76-2.76 8.97c-0.23 0.78-0.95 1.32-1.76 1.32h-0.03c-0.8 0.01-1.51-0.49-1.77-1.25l-7.65-20.61q0-0.01 0-0.02c-0.24-0.68-0.06-1.43 0.45-1.93 0.5-0.51 1.25-0.68 1.93-0.45l0.02 0.01 20.61 7.64zm-0.62 1.76h-0.02l-20.6-7.65 7.64 20.61 0.01 0.02 2.76-8.97c0.18-0.59 0.65-1.06 1.24-1.24l8.97-2.76z"/>
                        </g>
                    </svg>`;

                    L.DomEvent.disableClickPropagation(container);
                    container.onclick = function() {
                        if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(function(pos) {
                                var latlng = [pos.coords.latitude, pos.coords.longitude];
                                searchMap.setView(latlng, 15);
                            });
                        }
                    };
                    return container;
                },
                onRemove: function(map) {}
            });

            L.control.locate = function(opts) {
                return new L.Control.Locate(opts);
            }
            L.control.locate({ position: 'bottomright' }).addTo(searchMap);

            L.tileLayer(`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${maptilerKey}`, {
                attribution: '&copy; MapTiler &copy; OpenStreetMap contributors'
            }).addTo(searchMap);

            searchMarkers = L.layerGroup().addTo(searchMap);
        }
    }

    initSearchMap();

   if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;
                window.userLat = userLat;
                window.userLng = userLng;

                const userIcon = L.icon({
                    iconUrl: "/wp-content/uploads/2025/10/user-location.svg",
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20],
                });

                if (userMarker) searchMap.removeLayer(userMarker);
                userMarker = L.marker([userLat, userLng], { icon: userIcon })
                    .addTo(searchMap)
                    .bindPopup("You are here");

                searchMap.setView([userLat, userLng], 13);
            },
            function(err) {
                console.warn("Geolocation not allowed:", err.message);
            }
        );
    }

    function addMarkers(posts, layerGroup, map) {
        layerGroup.clearLayers();
        let bounds = L.latLngBounds([]);

        posts.forEach(post => {
            const lat = parseFloat(post.lat);
            const lng = parseFloat(post.long || post.lng);
            if (!lat || !lng) return;

            var customIcon = L.divIcon({
                className: 'custom-marker ' + post.cat_slug,
                html: `<svg width="32" height="46" viewBox="0 0 32 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.9998 1.4707C20.0033 1.4707 23.8408 3.0932 26.6687 5.97754C29.4962 8.86164 31.0837 12.7712 31.0837 16.8457C31.0837 19.7339 30.1421 22.9281 28.7625 26.0693C27.38 29.2169 25.5409 32.3474 23.7087 35.1172C21.8756 37.8884 20.0432 40.3079 18.6697 42.0342C17.9828 42.8975 17.4101 43.5881 17.0085 44.0635C16.8078 44.3012 16.6498 44.4855 16.5417 44.6104C16.4877 44.6727 16.4459 44.7207 16.4177 44.7529C16.4038 44.7689 16.3928 44.7808 16.3855 44.7891C16.3819 44.7932 16.3796 44.7967 16.3777 44.7988L16.3748 44.8018L15.9998 45.2246L15.6257 44.8018L15.6228 44.7988C15.6209 44.7967 15.6177 44.7932 15.614 44.7891C15.6067 44.7808 15.5957 44.7689 15.5818 44.7529C15.5536 44.7208 15.5127 44.6727 15.4587 44.6104C15.3507 44.4855 15.1927 44.3012 14.9919 44.0635C14.5904 43.5881 14.0168 42.8976 13.3298 42.0342C11.9563 40.308 10.1247 37.8883 8.29175 35.1172C6.4596 32.3474 4.62052 29.217 3.23804 26.0693C1.85836 22.9281 0.916748 19.7339 0.916748 16.8457C0.916748 12.7712 2.50337 8.86162 5.33081 5.97754C8.15861 3.09318 11.9963 1.47079 15.9998 1.4707ZM15.9998 12.0332C14.7544 12.0333 13.5583 12.5381 12.6746 13.4395C11.7905 14.3412 11.2917 15.5662 11.2917 16.8457C11.2917 18.1252 11.7905 19.3502 12.6746 20.252C13.5583 21.1533 14.7544 21.6581 15.9998 21.6582C16.6167 21.6582 17.2281 21.534 17.7986 21.293C18.3691 21.0519 18.8883 20.6984 19.3259 20.252C19.7636 19.8055 20.111 19.275 20.3484 18.6904C20.5858 18.1058 20.7087 17.479 20.7087 16.8457C20.7087 15.5663 20.21 14.3412 19.3259 13.4395C18.4421 12.538 17.2453 12.0332 15.9998 12.0332Z" fill="#D72C19" stroke="black"/>
                </svg>`,
                iconSize: [32, 45],
                iconAnchor: [16, 45]
            });

            var customIconToilet = L.divIcon({
                className: 'custom-marker-toilet ' + post.cat_slug,
                html: `
<svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24.583 3.5293C28.5834 3.5293 32.4203 5.11859 35.249 7.94727C38.0775 10.7758 39.6669 14.6122 39.667 18.6123C39.667 21.4478 38.7247 24.5827 37.3447 27.6631C35.9618 30.75 34.1214 33.8194 32.2891 36.5352C30.4557 39.2524 28.6236 41.6249 27.25 43.3174C26.563 44.1639 25.9904 44.8415 25.5889 45.3076C25.3883 45.5405 25.2301 45.7204 25.1221 45.8428C25.068 45.904 25.0263 45.9509 24.998 45.9824C24.9839 45.9982 24.9731 46.0104 24.9658 46.0186C24.9622 46.0226 24.9589 46.0252 24.957 46.0273C24.9561 46.0284 24.9556 46.0297 24.9551 46.0303V46.0312L24.583 45.6963L24.9541 46.0312L24.583 46.4424L24.2119 46.0312L24.2109 46.0303C24.2104 46.0297 24.2099 46.0283 24.209 46.0273C24.2071 46.0253 24.2046 46.0223 24.2012 46.0186C24.1939 46.0104 24.183 45.9981 24.1689 45.9824C24.1407 45.9509 24.099 45.904 24.0449 45.8428C23.9369 45.7205 23.7787 45.5405 23.5781 45.3076C23.1766 44.8415 22.6031 44.1639 21.916 43.3174C20.5424 41.6249 18.7102 39.2523 16.877 36.5352C15.0447 33.8194 13.2052 30.7499 11.8223 27.6631C10.4422 24.5827 9.5 21.4478 9.5 18.6123C9.50009 14.6121 11.0894 10.7759 13.918 7.94727C16.7466 5.11867 20.5828 3.52938 24.583 3.5293Z" fill="#C7C7C7" stroke="black"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M25.3517 30.3861C25.3623 30.3861 25.3728 30.386 25.3833 30.386C25.3864 30.3859 25.3894 30.386 25.3925 30.386C25.4048 30.3859 25.417 30.3858 25.4292 30.3858L25.3925 30.386H25.3833L25.3517 30.3861Z" fill="#171717"/>
<rect x="18" y="13.0293" width="4.33846" height="9.4" rx="1" fill="#171717"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M18 23.1523H24.1462H26.3154H32.4615C32.4615 25.0162 30.6538 26.7677 28.3038 27.3749C28.3038 27.3749 27.4 27.4908 27.4 28.2379C27.4 28.937 28.4048 29.6984 29.2299 30.0216C29.8047 30.2466 30.2923 31.3908 30.2923 31.8293H28.3038H26.3154H24.1462H20.1692C20.1692 31.3908 20.6568 30.2466 21.2316 30.0216C22.0567 29.6984 23.0615 28.937 23.0615 28.2379C23.0615 27.5388 22.3385 27.3749 22.3385 27.3749C19.7734 26.625 18 25.0162 18 23.1523Z" fill="#171717"/>
<path d="M23.0615 22.4293C23.0615 21.6306 23.709 20.9832 24.5077 20.9832H31.0154C31.8141 20.9832 32.4615 21.6306 32.4615 22.4293H23.0615Z" fill="#171717"/>
</svg>`,
                iconSize: [32, 45],
                iconAnchor: [16, 45]
            });

            if (post.cat_slug == "hygien") {
                customIcon = customIconToilet;
            }

            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(layerGroup);

            marker.on("click", function() {
                $('#search-map').addClass('search-media-map');
                $('.search-data').hide();

                let repeaterSingleHTML = '';
                let readMoreHtml = '';
                let featureSrc = '';

                if (post.repeater_data && post.repeater_data.length) {
                    repeaterSingleHTML = '<div class="post-facilities">';
                    post.repeater_data.forEach(f => {
                        repeaterSingleHTML += `<img src="${f.facilitity_image.url}" class="facility-image" />`;
                    });
                    repeaterSingleHTML += '</div>';
                }

                featureSrc = post.image || "/wp-content/uploads/2025/10/SSM_png_search.svg";

                if ($(this._icon).hasClass('custom-marker-toilet')) {
                    $(".main-img-logo").hide();
                    if (!$(".title-replace").length) {
                        $(".main-img-logo").before("<p class='title-replace'></p>");
                    }
                    $(".title-replace").html(post.title).show();
                    $(".location-info-content").html('');
                    readMoreHtml = "";
                } else {
                    $(".main-img-logo").show();
                    $(".main-img-logo img").attr('src', featureSrc);
                    $(".title-replace").hide();
                    $(".location-info-content").html("<p>" + post.title + "</p>");
                    readMoreHtml = '<a href="#" data-post-id="' + post.id + '" class="read-more-link">Läs Mer</a>';
                }

                let todayStatusHtml = "";
                const swedishDays = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
                const todayIndex = new Date().getDay();
                const todayName = swedishDays[todayIndex];

                const statusTextMap = {
                    "open-time": "Öppet",
                    "closing-soon-time": "Stänger snart",
                    "closed-time": "Stängt"
                };

                const validRows = post.opening_hours_grouped.filter(item =>
                    item.hours?.trim() &&
                    item.hours.trim() !== "-" &&
                    Array.isArray(item.days) &&
                    item.days.some(d => d?.trim())
                );

                const todayRow = validRows.find(r => r.days.includes(todayName));

                function makeStatus(type, label) {
                    return `<span class="${type}">${statusTextMap[type]}</span><span class="status-time">${label}</span>`;
                }

                if (!todayRow || todayRow.hours === "Closed") {
                    for (let i = 1; i <= 7; i++) {
                        const nextIndex = (todayIndex + i) % 7;
                        const nextDay = swedishDays[nextIndex];
                        const nextRow = validRows.find(r => r.days.includes(nextDay) && r.hours !== "Closed");
                        if (nextRow) {
                            const nextOpen = nextRow.hours.split("-")[0].trim();
                            todayStatusHtml = makeStatus("closed-time", `Öppnar ${nextOpen}`);
                            break;
                        }
                    }
                } else {
                    const [open, close] = todayRow.hours.split("-").map(h => h.trim());
                    const now = new Date();
                    const [oh, om] = open.split(":");
                    const [ch, cm] = close.split(":");

                    const openTime = new Date();
                    const closeTime = new Date();
                    openTime.setHours(Number(oh), Number(om), 0, 0);
                    closeTime.setHours(Number(ch), Number(cm), 0, 0);

                    const minsToClose = Math.round((closeTime - now) / 60000);

                    if (now < openTime) {
                        todayStatusHtml = makeStatus("closed-time", `Öppnar ${open}`);
                    } else if (minsToClose <= 0) {
                        for (let i = 1; i <= 7; i++) {
                            const nextIndex = (todayIndex + i) % 7;
                            const nextDay = swedishDays[nextIndex];
                            const nextRow = validRows.find(r => r.days.includes(nextDay) && r.hours !== "Closed");
                            if (nextRow) {
                                const nextOpen = nextRow.hours.split("-")[0].trim();
                                todayStatusHtml = makeStatus("closed-time", `Öppnar ${nextOpen}`);
                                break;
                            }
                        }
                    } else if (minsToClose <= 30) {
                        todayStatusHtml = makeStatus("closing-soon-time", close);
                    } else {
                        todayStatusHtml = makeStatus("open-time", `Stänger ${close}`);
                    }
                }

                const status = todayStatusHtml;

                $(".opening-time").html(status);
                $(".location-street").html(post.address);
                $(".facility-area").html(repeaterSingleHTML);
                $(".location-info-btns").html(`
                    ${readMoreHtml}
                    <a href="#" data-lat="${lat}" data-lang="${lng}" class="btn_icon">
                        <img src="/wp-content/uploads/2025/10/directions-1.svg" alt="Karta ikon"><span>Vägbeskrivning</span>
                    </a>
                `);

                // $(".location-distance").html("<p>Calculating...</p>");
                $(".location-info-wrap").fadeIn();

                // if (userLat && userLng) {
                //     calculateDistance(userLat, userLng, lat, lng, function(result) {
                //         $(".location-distance").html(`<img src='/wp-content/uploads/2025/10/directions_walk.svg' style='width:16px;margin-right:4px;'> ${result}`);
                //     });
                // } else {
                //     $(".location-distance").html("<p>User location unavailable</p>");
                // }
            });

            bounds.extend([lat, lng]);
        });

        if (bounds.isValid()) searchMap.fitBounds(bounds, { padding: [50, 50] });
    }

    // Search Handler
       // Search Handler - UPDATED
    $('#custom-search-input').on('input', function() {
        const query = $(this).val().trim();

        if (query.length < 3) {
            $(".location-info-wrap").fadeOut();
            $('.search-wrapper').removeClass('compact');
            $('.back-search-btn').hide();
            $('.gt_switcher').show();
            $('#search-results').empty();
            $('.service_cat').show();
            $('#map').show();
            $('#search-map').hide();
            if (searchMarkers) searchMarkers.clearLayers();
            if (searchMap) searchMap.setView([20.5937, 78.9629], 5);
            return;
        }

        $.ajax({
            url: '<?php echo admin_url('admin-ajax.php'); ?>',
            type: 'POST',
            data: { action: 'custom_search', s: query },
            success: function(response) {
                $('#search-results').empty();
                if (response.success) {
                    $('.gt_switcher').hide();
                    $(".location-info-wrap").fadeOut();
                    $('.search-wrapper').addClass('compact');
                    $('.back-search-btn').show();
                    $('.service_cat').hide();
                    $('#map').hide();
                    initSearchMap();
                    $('#search-map').hide();

                    let html = '<div class="search-data">';
                    response.data.forEach(post => {
                        // Get distance text
                        let distanceText = 'Calculating...';
                        if (userLat && userLng) {
                            const R = 6371;
                            const dLat = (parseFloat(post.lat) - userLat) * Math.PI / 180;
                            const dLng = (parseFloat(post.long) - userLng) * Math.PI / 180;
                            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                      Math.cos(userLat * Math.PI / 180) * Math.cos(parseFloat(post.lat) * Math.PI / 180) *
                                      Math.sin(dLng/2) * Math.sin(dLng/2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                            const distanceKm = (R * c).toFixed(1);
                            const durationMin = Math.ceil((R * c) / 5 * 60);
                            distanceText = `${durationMin} min (${distanceKm} km)`;
                        }

                        html += `
                            <div class="search-result" data-postid="${post.id}" data-lat="${post.lat}" data-long="${post.long}">
                                <img src="${post.image ? post.image : '/wp-content/uploads/2025/10/SSM_png_search.svg'}" alt="Search" class="post-listing-img">
                                <h3>${post.title}</h3>
    
                                <p>${post.address || 'N/A'}</p>
                            </div>
                        `;
                    });
                    html += '</div>';
                    $('#search-results').html(html);

                    if (window.matchMedia("(min-width: 769px)").matches) {
                        $('#search-map').show();
                        addMarkers(response.data, searchMarkers, searchMap);
                        searchMap.invalidateSize();
                    }
                } else {
                    $(".location-info-wrap").fadeOut();
                    $('#search-results').html('<p>No results found</p>');
                    if (searchMarkers) searchMarkers.clearLayers();
                    $('#map').show();
                    $('#search-map').hide();
                    $('.service_cat').show();
                }
            }
        });
    });

    $('#clear-search').on('click', function() {
        $('#custom-search-input').val('').trigger('input');
    });

    $('.back-search-btn').on('click', function() {
        if ($('.location-info-wrap').length > 0) {
            $('.location-info-wrap').fadeOut();
            $('.close-location').removeClass('close-compact');
        }
        $('#custom-search-input').val('').trigger('input');
    });

    $(document).on('click', '.close-location.close-compact', function() {
        $('.search-wrapper').addClass('compact');
        $('.close-location').removeClass('close-compact');
    });

    if (window.matchMedia("(max-width: 767px)").matches) {
        $(document).on('click', '.close-location.close-compact', function() {
            $('#search-map').hide();
        });
    }
});

</script>
<?php }

// ================================================
// AJAX Handlers
// ================================================

add_action('wp_ajax_custom_search', 'custom_search');
add_action('wp_ajax_nopriv_custom_search', 'custom_search');

function custom_search() {
    $args = [
        'post_type' => 'services',
        's' => sanitize_text_field($_POST['s']),
    ];

    $query = new WP_Query($args);
    $results = [];

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $id = get_the_ID();

            $terms = wp_get_post_terms($id, 'services_category');
            $cat = null;
            if (!empty($terms)) {
                foreach ($terms as $term) {
                    if ($term->parent == 0) {
                        $cat = $term;
                        break;
                    }
                }
                if (!$cat) $cat = $terms[0];
            }

            $image = null;
            if ($cat && $cat->slug == "hygien") {
                $image = "https://tryggaplatser.nu/wp-content/uploads/2025/11/stockholms-stad-logo-png_seeklogo-402794-1.png";
            } else {
                $image = get_the_post_thumbnail_url($id);
            }

            $opening_hours_grouped = get_opening_hours_grouped_search($id);
            $repeater_data = get_facilities_repeater($id);

            $results[] = [
                'id' => $id,
                'title' => get_the_title(),
                'image' => $image,
                'address' => get_post_meta($id, 'street_name', true),
                'lat' => get_post_meta($id, 'lat', true),
                'long' => get_post_meta($id, 'long', true),
                'repeater_data' => $repeater_data,
                'opening_hours_grouped' => $opening_hours_grouped,
                'link' => get_permalink($id),
                'cat_slug' => $cat ? $cat->slug : '',
            ];
        }
        wp_reset_postdata();
        wp_send_json_success($results);
    } else {
        wp_send_json_error('No results found');
    }
}

add_action('wp_ajax_get_location_details', 'get_location_details');
add_action('wp_ajax_nopriv_get_location_details', 'get_location_details');

function get_location_details() {
    if (!isset($_POST['post_id'])) {
        wp_send_json_error('Missing post_id');
    }

    $post_id = intval($_POST['post_id']);
    $post = get_post($post_id);

    if (!$post) {
        wp_send_json_error('Post not found');
    }

    $terms = wp_get_post_terms($post_id, 'services_category');
    $cat = null;
    if (!empty($terms)) {
        foreach ($terms as $term) {
            if ($term->parent == 0) {
                $cat = $term;
                break;
            }
        }
        if (!$cat) $cat = $terms[0];
    }

    $cat_slug = $cat ? $cat->slug : '';
    
    $image = null;
    if ($cat_slug == "hygien") {
        $image = "https://tryggaplatser.nu/wp-content/uploads/2025/11/stockholms-stad-logo-png_seeklogo-402794-1.png";
    } else {
        $image = get_the_post_thumbnail_url($post_id);
    }

    $post_data = [
        'id' => $post_id,
        'title' => get_the_title($post_id),
        'image' => $image,
        'address' => get_post_meta($post_id, 'street_name', true),
        'lat' => get_post_meta($post_id, 'lat', true),
        'long' => get_post_meta($post_id, 'long', true),
        'repeater_data' => get_facilities_repeater($post_id),
        'opening_hours_grouped' => get_opening_hours_grouped_search($post_id),
        'cat_slug' => $cat_slug,
    ];

    wp_send_json_success($post_data);
}

// ================================================
// Helper Functions
// ================================================

function get_opening_hours_grouped_search($post_id) {
    $opening_hours_grouped = [];
    $rows = get_field('weekly_hour', $post_id);

    if ($rows) {
        $sorted = [];

        foreach ($rows as $row) {
            $day = $row['day'];
            $closed = $row['is_closed'];
            $open = $row['day_opening_time'];
            $close = $row['day_closing_time'];

            $key = $closed ? 'Stängt' : "{$open}-{$close}";

            if (!isset($sorted[$key])) {
                $sorted[$key] = [];
            }
            $sorted[$key][] = $day;
        }

        foreach ($sorted as $hours => $days) {
            $opening_hours_grouped[] = [
                'days' => $days,
                'hours' => $hours,
            ];
        }
    }

    return $opening_hours_grouped;
}

function get_facilities_repeater($post_id) {
    $repeater_data = [];
    if (have_rows('facilities', $post_id)) {
        while (have_rows('facilities', $post_id)) {
            the_row();
            $repeater_data[] = [
                'facilitity_image' => get_sub_field('facilitity_image'),
                'facilitity_text' => get_sub_field('facilitity_text'),
            ];
        }
    }
    return $repeater_data;
}

add_action('wp_footer', 'disable_search_enter');
function disable_search_enter() {
    ?>
    <script type="text/javascript">
        jQuery(document).ready(function() {
            jQuery('#custom-search-form').on('keyup keypress', function(e) {
                var keyCode = e.keyCode || e.which;
                if (keyCode === 13) {
                    e.preventDefault();
                    return false;
                }
            });
        });
    </script>
    <?php
}