<?php
function retrospect_child_enqueue_styles() {
    // Load parent theme CSS
    wp_enqueue_style(
        'retrospect-parent-style',
        get_template_directory_uri() . '/style.css'
    );

    // Load child theme CSS
    wp_enqueue_style(
        'retrospect-child-style',
        get_stylesheet_directory_uri() . '/style.css',
        array('retrospect-parent-style')
    );
}
add_action('wp_enqueue_scripts', 'retrospect_child_enqueue_styles');
/**
 * Theme Functions - Services Map Application
 * 
 * Handles script enqueuing and theme setup for the modular services map.
 */

// ============================================================================
// SETUP: Include PHP Helpers & AJAX Handlers
// ============================================================================

require_once get_stylesheet_directory() . '/php/helpers.php';
require_once get_stylesheet_directory() . '/php/ajax-handlers.php';

// ============================================================================
// ENQUEUE: Core Libraries (Leaflet, jQuery)
// ============================================================================

add_action('wp_enqueue_scripts', 'enqueue_core_libraries');
function enqueue_core_libraries() {
    // Enqueue jQuery
    wp_enqueue_script('jquery');
    
    // Enqueue Leaflet CSS
    wp_enqueue_style('leaflet-css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
    
    
    // Enqueue Leaflet JS
    wp_enqueue_script('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 
        array('jquery'), null, true);
}

// ============================================================================
// ENQUEUE: Modular JavaScript Files
// ============================================================================

add_action('wp_enqueue_scripts', 'enqueue_app_modules', 20);
function enqueue_app_modules() {
    if (!is_front_page()) {
        return;
    }

    $theme_url = get_stylesheet_directory();
    $version = '1.0.0';

    // Helper functions (no dependencies)
    wp_enqueue_script('helpers', 
        $theme_url . '/js/modules/helpers.js', 
        array('jquery'),
        $version, 
        true);

    // Map manager (depends on Leaflet, helpers)
    wp_enqueue_script('map-manager', 
        $theme_url . '/js/modules/map-manager.js', 
        array('leaflet-js', 'helpers'),
        $version, 
        true);

    // Data fetcher (depends on jQuery)
    wp_enqueue_script('data-fetcher', 
        $theme_url . '/js/modules/data-fetcher.js', 
        array('jquery'),
        $version, 
        true);

    // Renderer (depends on helpers)
    wp_enqueue_script('renderer', 
        $theme_url . '/js/modules/renderer.js', 
        array('jquery', 'helpers'),
        $version, 
        true);

    // UI State Manager (depends on renderer, map-manager, data-fetcher)
    wp_enqueue_script('ui-state-manager', 
        $theme_url . '/js/modules/ui-state-manager.js', 
        array('jquery'),
        $version, 
        true);

    // App Controller (depends on all modules)
    wp_enqueue_script('app-controller', 
        $theme_url . '/js/modules/app-controller.js', 
        array('jquery', 'map-manager', 'data-fetcher', 'renderer', 'ui-state-manager', 'helpers'),
        $version, 
        true);

    // Main entry point
    wp_enqueue_script('app-main', 
        $theme_url . '/js/main.js', 
        array('app-controller'),
        $version, 
        true);

        

    // Localize script to provide AJAX URL to JavaScript
    wp_localize_script('data-fetcher', 'wpSettings', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'homeUrl' => home_url(),
    ));
}

// ============================================================================
// HELPER: Make ajaxurl available globally for legacy code
// ============================================================================

add_action('wp_footer', 'expose_ajax_url');
function expose_ajax_url() {
    if (!is_front_page()) {
        return;
    }
    ?>
    <script>
    // Expose ajaxurl globally for data-fetcher.js fallback
    if (typeof ajaxurl === 'undefined') {
        var ajaxurl = '<?php echo admin_url("admin-ajax.php"); ?>';
    }
    </script>
    <?php
}

