<?php

/**
 * Backend Helper Functions for Opening Hours
 * 
 * Consolidates opening hours logic used across multiple functions
 * to avoid duplication and improve maintainability.
 */

/**
 * Process and group opening hours from ACF weekly_hour repeater
 * 
 * @param int $post_id
 * @return array Grouped opening hours with days and times
 */
function get_opening_hours_grouped($post_id) {
    $opening_hours_grouped = [];
    $rows = get_field('weekly_hour', $post_id);

    if (!$rows) {
        return $opening_hours_grouped;
    }

    $sorted = [];

    // First pass: group by time
    foreach ($rows as $row) {
        $day    = $row['day'] ?? '';
        $closed = $row['is_closed'] ?? false;
        $open   = $row['day_opening_time'] ?? '';
        $close  = $row['day_closing_time'] ?? '';

        // Create grouping key
        $key = $closed ? 'Stängt' : "{$open}-{$close}";

        if (!isset($sorted[$key])) {
            $sorted[$key] = [];
        }
        $sorted[$key][] = $day;
    }

    // Second pass: format for frontend
    foreach ($sorted as $hours => $days) {
        $opening_hours_grouped[] = [
            'days'  => $days,
            'hours' => $hours,
        ];
    }

    return $opening_hours_grouped;
}


/**
 * Get facilities repeater data for a post
 * 
 * @param int $post_id
 * @return array Facilities with images and descriptions
 */
function get_post_facilities($post_id) {
    $repeater_data = [];
    
    if (have_rows('facilities', $post_id)) {
        while (have_rows('facilities', $post_id)) {
            the_row();
            $repeater_data[] = [
                'facilitity_image' => get_sub_field('facilitity_image'),
                'facilitity_text'  => get_sub_field('facilitity_text'),
            ];
        }
    }

    return $repeater_data;
}


/**
 * Get groups schedule data for a post
 * 
 * @param int $post_id
 * @return array Groups with opening days
 */
function get_post_groups_schedule($post_id) {
    $groups_schedule = [];

    if (have_rows('groups_schedule', $post_id)) {
        while (have_rows('groups_schedule', $post_id)) {
            the_row();
            
            $group_name = get_sub_field('group_name');
            $opening_days = [];
            
            if (have_rows('opening_days')) {
                while (have_rows('opening_days')) {
                    the_row();
                    $opening_days[] = [
                        'day'   => get_sub_field('day'),
                        'open'  => get_sub_field('group_opening_time'),
                        'close' => get_sub_field('group_closing_time'),
                    ];
                }
            }

            $groups_schedule[] = [
                'group_name'   => $group_name,
                'opening_days' => $opening_days
            ];
        }
    }

    return $groups_schedule;
}


/**
 * Get image for a service based on category
 * 
 * @param int $post_id
 * @param string $cat_slug Category slug
 * @return string Image URL
 */
function get_service_image($post_id, $cat_slug) {
    if ($cat_slug == "hygien") {
        return "/wp-content/uploads/2025/11/stockholms-stad-logo-png_seeklogo-402794-1.png";
    }
    return get_the_post_thumbnail_url($post_id);
}


/**
 * Build service category tags HTML from group selections
 * 
 * @param int $post_id
 * @return string HTML for service category tags
 */
function build_service_category_html($post_id) {
    $selected = get_field('group_selection', $post_id);
    
    $icon_map = [
        'barn'   => ['url' => '/wp-content/uploads/2025/10/child_friendly.svg', 'label' => 'Barn/unga'],
        'familj' => ['url' => '/wp-content/uploads/2025/10/family_restroom.svg', 'label' => 'Familj'],
        'kvinnor' => ['url' => '/wp-content/uploads/2025/10/woman.svg', 'label' => 'Kvinnor'],
        'man' => ['url' => '/wp-content/uploads/2025/10/man.svg', 'label' => 'Män'],
        'vuxna' => ['url' => '/wp-content/uploads/2025/10/wc.svg', 'label' => 'Vuxna'],
        'senior' => ['url' => '/wp-content/uploads/2025/10/elderly.svg', 'label' => 'Senior'],
    ];

    $service_category_html = '';
    if ($selected) {
        foreach ($selected as $value) {
            if (isset($icon_map[$value])) {
                $i = $icon_map[$value];
                $service_category_html .= sprintf(
                    '<div class="tag %s"><img src="%s" alt="%s"><span>%s</span></div>',
                    esc_attr($value),
                    esc_url($i['url']),
                    esc_attr($i['label']),
                    esc_html($i['label'])
                );
            }
        }
    }

    return $service_category_html;
}


/**
 * Get category for a post
 * 
 * @param int $post_id
 * @param int $cat_id (optional) Preferred category ID
 * @return object|null Category term object
 */
function get_post_category($post_id, $cat_id = 0) {
    $terms = wp_get_post_terms($post_id, 'services_category');
    
    if (empty($terms)) {
        return null;
    }

    $cat = null;

    // If specific category ID provided, find it
    if ($cat_id > 0) {
        foreach ($terms as $term) {
            if ($term->term_id == $cat_id) {
                $cat = $term;
                break;
            }
        }
    }

    // If no cat found, try to find parent (top-level) category
    if (!$cat) {
        foreach ($terms as $term) {
            if ($term->parent == 0) {
                $cat = $term;
                break;
            }
        }
    }

    // Fallback to first term
    if (!$cat) {
        $cat = $terms[0];
    }

    return $cat;
}


/**
 * Ensure service link has protocol
 * 
 * @param string $link
 * @return string
 */
function sanitize_service_link($link) {
    if ($link && !preg_match("~^https?://~", $link)) {
        $link = "https://{$link}";
    }
    return $link;
}
