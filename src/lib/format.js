// Keep these two values in sync with place_order() in supabase/schema.sql
/** Minimum cart value required to qualify for free shipping (in INR). */
export const FREE_SHIPPING_THRESHOLD = 5000

/** Standard shipping fee applied when the order is below the threshold (in INR). */
export const SHIPPING_FEE = 199

/**
 * Formats a numeric value into an Indian Rupee (INR) currency string.
 * 
 * @param {number|string} n - The numeric price to format.
 * @returns {string} The formatted currency string (e.g., "₹5,000").
 */
export const formatPrice = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0)

/**
 * Formats a date value into a readable Indian locale date string.
 * 
 * @param {string|number|Date} d - The date to format.
 * @returns {string} The formatted date string (e.g., "13 Oct 2026").
 */
export const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Converts a string into a URL-friendly slug by converting to lowercase,
 * trimming whitespace, and replacing non-alphanumeric characters with hyphens.
 * 
 * @param {string} s - The string to slugify.
 * @returns {string} The resulting URL slug (e.g., "hello-world").
 */
export const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')