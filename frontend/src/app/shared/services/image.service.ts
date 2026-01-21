import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Image Service
 * Centralizes image URL handling and processing logic
 * Used by EventCard, EventDetail, MyTickets, and other components
 */
@Injectable({
  providedIn: 'root'
})
export class ImageService {
  
  // Default fallback images
  private readonly DEFAULT_EVENT_IMAGE = 'https://lh3.googleusercontent.com/d/1BqOKNhwjsLitFxWKUBG8wPHoLlGJKqJH';
  private readonly DEFAULT_AVATAR_IMAGE = 'https://via.placeholder.com/150x150/cccccc/666666?text=User';
  private readonly DEFAULT_PLACEHOLDER = 'https://via.placeholder.com/400x300/f0f0f0/999999?text=No+Image';

  /**
   * Get event image URL with fallback handling
   */
  getEventImageUrl(imageUrl?: string | null, eventName?: string): string {
    // Return default if no image URL provided
    if (!imageUrl) {
      return this.DEFAULT_EVENT_IMAGE;
    }

    // If it's already a full HTTP URL and not from our MinIO server, return as-is
    if (imageUrl.startsWith('http') && !imageUrl.includes('minio')) {
      return imageUrl;
    }

    // Handle MinIO/local file URLs
    let filename = imageUrl;
    
    // Extract filename if it's a path
    if (filename.includes('/')) {
      const parts = filename.split('/');
      filename = parts[parts.length - 1] || filename;
    }

    // Construct full URL for our API
    return `${environment.apiUrl}/events/file/${filename}`;
  }

  /**
   * Get user avatar URL with fallback
   */
  getUserAvatarUrl(avatarUrl?: string | null, userName?: string): string {
    if (!avatarUrl) {
      return this.generateAvatarUrl(userName);
    }

    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }

    return `${environment.apiUrl}/profile/avatar/${avatarUrl}`;
  }

  /**
   * Generate avatar URL based on user name (using initials)
   */
  private generateAvatarUrl(userName?: string): string {
    if (!userName) {
      return this.DEFAULT_AVATAR_IMAGE;
    }

    const initials = this.getInitials(userName);
    const backgroundColor = this.generateColorFromString(userName);
    const textColor = this.getContrastColor(backgroundColor);
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=${textColor}&size=150&bold=true`;
  }

  /**
   * Get initials from name
   */
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  /**
   * Generate consistent color from string
   */
  private generateColorFromString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return this.hslToHex(hue, 50, 60);
  }

  /**
   * Convert HSL to HEX
   */
  private hslToHex(h: number, s: number, l: number): string {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * Get contrast color (black or white) for background
   */
  private getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5 ? '000000' : 'ffffff';
  }

  /**
   * Validate image URL
   */
  isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Get placeholder image with custom text
   */
  getPlaceholderImage(width: number = 400, height: number = 300, text: string = 'No Image'): string {
    return `https://via.placeholder.com/${width}x${height}/f0f0f0/999999?text=${encodeURIComponent(text)}`;
  }

  /**
   * Optimize image URL for different sizes
   */
  getOptimizedImageUrl(imageUrl: string, size: 'thumbnail' | 'medium' | 'large' = 'medium'): string {
    // If it's our API URL, we can add size parameters
    if (imageUrl.includes(environment.apiUrl)) {
      const sizeParams = {
        thumbnail: '?w=150&h=150&fit=crop',
        medium: '?w=400&h=300&fit=crop',
        large: '?w=800&h=600&fit=crop'
      };
      
      return `${imageUrl}${sizeParams[size]}`;
    }

    // For external URLs, return as-is
    return imageUrl;
  }

  /**
   * Preload image to check if it exists
   */
  preloadImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  /**
   * Get image with fallback chain
   */
  async getImageWithFallback(primaryUrl?: string | null, fallbackUrl?: string, defaultUrl?: string): Promise<string> {
    const urls = [primaryUrl, fallbackUrl, defaultUrl, this.DEFAULT_PLACEHOLDER].filter(Boolean) as string[];
    
    for (const url of urls) {
      if (await this.preloadImage(url)) {
        return url;
      }
    }
    
    return this.DEFAULT_PLACEHOLDER;
  }

  /**
   * Extract filename from URL
   */
  getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'unknown';
    } catch {
      return url.split('/').pop() || 'unknown';
    }
  }

  /**
   * Check if image is from our CDN/API
   */
  isInternalImage(url: string): boolean {
    return url.includes(environment.apiUrl) || url.includes('minio');
  }

  /**
   * Get image dimensions from URL (if supported by service)
   */
  getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }
}