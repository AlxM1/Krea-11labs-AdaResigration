/**
 * Security utilities for input validation and SSRF protection
 */

/**
 * Validate URL to prevent SSRF attacks
 * Blocks private IPs, localhost, and cloud metadata endpoints
 */
export function validateUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variations
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]'
    ) {
      return false;
    }

    // Block private IP ranges (IPv4)
    const privateIpPatterns = [
      /^127\./,           // 127.0.0.0/8
      /^10\./,            // 10.0.0.0/8
      /^192\.168\./,      // 192.168.0.0/16
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^169\.254\./,      // 169.254.0.0/16 (link-local)
    ];

    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return false;
      }
    }

    // Block cloud metadata endpoints
    const blockedHosts = [
      'metadata.google.internal',
      '169.254.169.254', // AWS, Azure, GCP metadata
      'fd00:ec2::254',   // AWS IPv6 metadata
    ];

    if (blockedHosts.includes(hostname)) {
      return false;
    }

    // Block IPv6 private addresses
    if (hostname.includes(':')) {
      // Simplified check for common private IPv6 ranges
      if (
        hostname.startsWith('fc') ||  // fc00::/7 Unique Local Address
        hostname.startsWith('fd') ||  // fd00::/8
        hostname.startsWith('fe80:')  // fe80::/10 Link-local
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize text input by removing control characters and limiting length
 */
export function sanitizeText(text: string, maxLength: number = 10000): string {
  if (!text) {
    return '';
  }

  // Remove null bytes and other dangerous control characters
  let sanitized = text.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}
