<?php

/**
 * AJAX Handlers for Services Map Application
 * 
 * Handles all AJAX requests for loading locations, posts, categories, etc.
 * Uses helper functions from helpers.php for business logic.
 */

// ============================================================================
// AJAX HANDLER: Get All Posts/Locations
// ============================================================================

add_action('wp_ajax_get_all_posts_locations', 'get_all_posts_locations_ajax');
add_action('wp_ajax_nopriv_get_all_posts_locations', 'get_all_posts_locations_ajax');

function get_all_posts_locations_ajax() {
	$posts = get_posts([
		'post_type' => 'services',
		'posts_per_page' => -1,
	]);

    $locations = [];

    foreach ($posts as $post) {
        $post_id = $post->ID;
        $lat = get_field('lat', $post_id);
        $lng = get_field('long', $post_id);

        // Skip if no coordinates
        if (!$lat || !$lng) {
            continue;
        }

        // Get category
        $cat = get_post_category($post_id);
        $cat_slug = $cat ? $cat->slug : '';

        // Skip hygien-only services for homepage
        $terms = wp_get_post_terms($post_id, 'services_category');
        if (!empty($terms)) {
            $slugs = wp_list_pluck($terms, 'slug');
            $slugs = array_unique($slugs);

            $only_hygien = (count($slugs) === 1 && in_array('hygien', $slugs, true));
            if ($only_hygien) {
                continue;
            }
        }

        // Get opening hours grouped
        $opening_hours_grouped = get_opening_hours_grouped($post_id);

        // Get facilities
        $repeater_data = get_post_facilities($post_id);

        // Get image
        $image = get_service_image($post_id, $cat_slug);

        $locations[] = [
            'id'                    => $post_id,
            'lat'                   => $lat,
            'lng'                   => $lng,
            'title'                 => get_the_title($post),
            'address'               => get_field('street_name', $post_id),
            'opening_hours'         => get_field('opening_hours', $post_id),
            'closing_hours'         => get_field('closing_hours', $post_id),
            'repeater_data'         => $repeater_data,
            'link'                  => get_permalink($post_id),
            'cat_slug'              => $cat_slug,
            'image'                 => $image,
            'opening_hours_grouped' => $opening_hours_grouped,
        ];
    }

    wp_send_json_success($locations);
}

// ============================================================================
// AJAX HANDLER: Load Category Posts
// ============================================================================

add_action('wp_ajax_load_category_posts', 'ajax_load_category_posts_snippet');
add_action('wp_ajax_nopriv_load_category_posts', 'ajax_load_category_posts_snippet');

function ajax_load_category_posts_snippet() {
    $cat_id = isset($_POST['cat_id']) ? intval($_POST['cat_id']) : 0;

    if (!$cat_id) {
        wp_send_json_error('Invalid category ID');
    }

    $args = [
        'post_type' => 'services',
        'tax_query' => [
            [
                'taxonomy' => 'services_category',
                'field' => 'term_id',
                'terms' => $cat_id,
                'orderby' => 'id',
                'order' => 'ASC'
            ]
        ],
        'posts_per_page' => -1
    ];

    $query = new WP_Query($args);
    $posts_data = [];

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $post_id = get_the_ID();

            // Get category
            $cat = get_post_category($post_id, $cat_id);
            $cat_slug = $cat ? $cat->slug : '';
            $cat_name = $cat ? $cat->name : '';
            $cat_image = ($cat && function_exists('z_taxonomy_image_url')) ? z_taxonomy_image_url($cat->term_id) : '';

            // Get opening hours grouped
            $opening_hours_grouped = get_opening_hours_grouped($post_id);

            // Get facilities
            $repeater_data = get_post_facilities($post_id);

            // Get image
            $image = get_service_image($post_id, $cat_slug);

            $posts_data[] = [
                'id'                    => $post_id,
                'title'                 => get_the_title(),
                'image'                 => $image,
                'street_name'           => get_post_meta($post_id, 'street_name', true),
                'opening_hours'         => get_post_meta($post_id, 'opening_hours', true),
                'closing_hours'         => get_post_meta($post_id, 'closing_hours', true),
                'cat_slug'              => $cat_slug,
                'cat_name'              => $cat_name,
                'cat_image'             => $cat_image,
                'repeater_data'         => $repeater_data,
                'opening_hours_grouped' => $opening_hours_grouped,
                'lat'                   => get_post_meta($post_id, 'lat', true),
                'long'                  => get_post_meta($post_id, 'long', true)
            ];
        }
        wp_reset_postdata();
    }

    wp_send_json_success($posts_data);
}

// ============================================================================
// AJAX HANDLER: Get Subcategories by Parent
// ============================================================================

add_action('wp_ajax_get_subcategories_by_parent', 'get_subcategories_by_parent');
add_action('wp_ajax_nopriv_get_subcategories_by_parent', 'get_subcategories_by_parent');

function get_subcategories_by_parent() {
    $parent_id = intval($_POST['parent_id'] ?? 0);

    if (!$parent_id) {
        wp_send_json_success([]);
    }

    $category = get_term($parent_id, 'services_category');
    $subcategories = get_terms([
        'taxonomy' => 'services_category',
        'hide_empty' => false,
        'parent' => $parent_id,
    ]);

    $data = [];
    foreach ($subcategories as $subcat) {
        $data[] = [
            'id' => $subcat->term_id,
            'name' => $subcat->name,
        ];
    }

    wp_send_json_success([
        'data' => $data,
        'cat_name' => $category ? $category->name : ''
    ]);
}

// ============================================================================
// AJAX HANDLER: Load Single Post Data
// ============================================================================

add_action('wp_ajax_load_single_post_data', 'load_single_post_data');
add_action('wp_ajax_nopriv_load_single_post_data', 'load_single_post_data');

function load_single_post_data() {
    if (!isset($_POST['post_id'])) {
        wp_send_json_error('Missing post_id');
    }

    $post_id = intval($_POST['post_id']);
    $cat_id = intval($_POST['cat_id'] ?? 0);
    $post = get_post($post_id);

    if (!$post) {
        wp_send_json_error('Post not found');
    }

    // Get category
    $cat = get_post_category($post_id, $cat_id);
    $cat_slug = $cat ? $cat->slug : '';
    $cat_name = $cat ? $cat->name : '';
    $cat_image = ($cat && function_exists('z_taxonomy_image_url')) ? z_taxonomy_image_url($cat->term_id) : '';

    // Get opening hours grouped
    $opening_hours_grouped = get_opening_hours_grouped($post_id);

    // Get facilities
    $repeater_data = get_post_facilities($post_id);

    // Get groups schedule
    $groups_schedule = get_post_groups_schedule($post_id);

    // Get image
    $image = get_service_image($post_id, $cat_slug);

    // Get service category HTML
    $service_category_html = build_service_category_html($post_id);

    // Get service link
    $service_link = get_post_meta($post_id, 'service_link', true);
    $service_link = sanitize_service_link($service_link);

    // Build post data
    $post_data = [
        'id'                    => $post_id,
        'title'                 => get_the_title($post_id),
        'image'                 => $image,
        'content'               => get_post_meta($post_id, 'description', true),
        'address'               => get_post_meta($post_id, 'street_name', true),
        'opening_hours'         => get_post_meta($post_id, 'opening_hours', true),
        'closing_hours'         => get_post_meta($post_id, 'closing_hours', true),
        'cat_slug'              => $cat_slug,
        'cat_name'              => $cat_name,
        'cat_image'             => $cat_image,
        'service_link'          => $service_link,
        'repeater_data'         => $repeater_data,
        'service_category_html' => $service_category_html,
        'groups_schedule'       => $groups_schedule,
        'opening_hours_grouped' => $opening_hours_grouped,
        'lat'                   => get_post_meta($post_id, 'lat', true),
        'long'                  => get_post_meta($post_id, 'long', true),
    ];

    wp_send_json_success($post_data);
}

// ============================================================================
// AJAX HANDLER: Load Multiple Subcategory Posts
// ============================================================================

add_action('wp_ajax_load_subcategory_posts_multiple', 'load_subcategory_posts_multiple');
add_action('wp_ajax_nopriv_load_subcategory_posts_multiple', 'load_subcategory_posts_multiple');

function load_subcategory_posts_multiple() {
    $subcat_ids = isset($_POST['subcat_ids']) ? array_map('intval', $_POST['subcat_ids']) : [];

    if (empty($subcat_ids)) {
        wp_send_json_success([]);
    }

    $query = new WP_Query([
        'post_type' => 'services',
        'posts_per_page' => -1,
        'tax_query' => [
            [
                'taxonomy' => 'services_category',
                'field' => 'term_id',
                'terms' => $subcat_ids,
                'operator' => 'IN',
            ]
        ]
    ]);

    $posts = [];
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $post_id = get_the_ID();

            // Get category
            $cat = get_post_category($post_id);
            $cat_slug = $cat ? $cat->slug : '';

            // Get opening hours grouped
            $opening_hours_grouped = get_opening_hours_grouped($post_id);

            // Get facilities
            $repeater_data = get_post_facilities($post_id);

            // Get image
            $image = get_service_image($post_id, $cat_slug);

            $posts[] = [
                'id'                    => $post_id,
                'title'                 => get_the_title(),
                'image'                 => $image,
                'street_name'           => get_post_meta($post_id, 'street_name', true),
                'repeater_data'         => $repeater_data,
                'opening_hours_grouped' => $opening_hours_grouped,
                'lat'                   => get_post_meta($post_id, 'lat', true),
                'long'                  => get_post_meta($post_id, 'long', true),
                'opening_hours'         => get_post_meta($post_id, 'opening_hours', true),
                'closing_hours'         => get_post_meta($post_id, 'closing_hours', true),
                'cat_slug'              => $cat_slug,
            ];
        }
    }
    wp_reset_postdata();

    wp_send_json_success($posts);
}

