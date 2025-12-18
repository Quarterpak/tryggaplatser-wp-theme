<?php

/**
 * Search Functionality - Updated for Single Map Instance
 * Now uses the same map instance as the rest of the application
 */

add_action('wp_footer', 'custom_search_js', 20);
function custom_search_js() { ?>
<style>
  #search-map {
      display: none; 
  }
</style>

<script>

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
        
        // Use MapManager to move to location
        if (typeof MapManager !== 'undefined' && lat && lng) {
            MapManager.flyTo(lat, lng, 15);
        }

        $('#search-map').addClass('search-media-map');
        $('.close-location').addClass('close-compact');
        $('.search-wrapper').removeClass('compact');
        $('.search-data').hide();
        $('.menu-head-wrap').hide();
        $(".location-info-wrap").fadeIn();
        $(".location-info-content").html("<p>Loading...</p>");
        $(".facility-area").html("");
        $(".opening-time").html("");

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

                // Use MapManager to center map
                if (typeof MapManager !== 'undefined' && lat && lng) {
                    MapManager.flyTo(lat, lng, 15);
                }
            },
            error: function() {
                $(".location-info-content").html("<p>Failed to load data.</p>");
            }
        });
    });
});

jQuery(document).ready(function($) {
    let userLat = null;
    let userLng = null;

    // Get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;
                window.userLat = userLat;
                window.userLng = userLng;

                // Add user marker using MapManager if available
                if (typeof MapManager !== 'undefined') {
                    MapManager.addUserMarker(userLat, userLng);
                }
            },
            function(err) {
                console.warn("Geolocation not allowed:", err.message);
            }
        );
    }

    // Search Handler
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
            
            // Clear markers using MapManager
            if (typeof MapManager !== 'undefined') {
                MapManager.clearMarkers();
            }
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

                    // Add markers using MapManager on desktop
                    if (window.matchMedia("(min-width: 769px)").matches) {
                        if (typeof MapManager !== 'undefined') {
                            MapManager.addMarkers(response.data, function(location) {
                                // Handle marker click
                                const lat = parseFloat(location.lat);
                                const lng = parseFloat(location.lng || location.long);
                                if (lat && lng) {
                                    MapManager.flyTo(lat, lng, 16);
                                }
                            });
                            MapManager.invalidateSize();
                        }
                    }
                } else {
                    $(".location-info-wrap").fadeOut();
                    $('#search-results').html('<p>No results found</p>');
                    if (typeof MapManager !== 'undefined') {
                        MapManager.clearMarkers();
                    }
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