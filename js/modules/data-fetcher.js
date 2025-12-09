/**
 * Data Fetching Module
 *
 * Centralizes all AJAX and API calls for locations, categories, posts, etc.
 * Provides a consistent interface for data retrieval across the application.
 */

const DataFetcher = {
  /**
   * Fetch all location markers
   *
   * @returns {Promise}
   */
  getAllLocations() {
    return jQuery.ajax({
      url: ajaxurl || '/wp-admin/admin-ajax.php',
      type: 'POST',
      data: { action: 'get_all_posts_locations' },
      dataType: 'json',
    });
  },

  /**
   * Fetch category posts
   *
   * @param {number} catId - Category ID
   * @returns {Promise}
   */
  getCategoryPosts(catId) {
    return jQuery.ajax({
      type: 'POST',
      url: ajaxurl || '/wp-admin/admin-ajax.php',
      data: { action: 'load_category_posts', cat_id: catId },
      dataType: 'json',
    });
  },

  /**
   * Fetch subcategories by parent
   *
   * @param {number} parentId - Parent category ID
   * @returns {Promise}
   */
  getSubcategoriesByParent(parentId) {
    return jQuery.ajax({
      type: 'POST',
      url: ajaxurl || '/wp-admin/admin-ajax.php',
      data: { action: 'get_subcategories_by_parent', parent_id: parentId },
      dataType: 'json',
    });
  },

  /**
   * Fetch single post data
   *
   * @param {number} postId - Post ID
   * @param {number} catId - Category ID (optional)
   * @returns {Promise}
   */
  getSinglePost(postId, catId = 0) {
    return jQuery.ajax({
      url: ajaxurl || '/wp-admin/admin-ajax.php',
      type: 'POST',
      dataType: 'json',
      data: {
        action: 'load_single_post_data',
        post_id: postId,
        cat_id: catId,
      },
    });
  },

  /**
   * Fetch posts for multiple subcategories
   *
   * @param {Array} subcatIds - Array of subcategory IDs
   * @returns {Promise}
   */
  getSubcategoryPostsMultiple(subcatIds) {
    return jQuery.ajax({
      type: 'POST',
      url: ajaxurl || '/wp-admin/admin-ajax.php',
      data: {
        action: 'load_subcategory_posts_multiple',
        subcat_ids: subcatIds,
      },
      dataType: 'json',
    });
  },
};
