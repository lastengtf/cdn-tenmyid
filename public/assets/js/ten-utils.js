/**
 * TEN Utils v1.0.0
 * Official shared JavaScript utility library for TEN-MY-ID platforms
 * CDN: https://cdn.ten.my.id/assets/js/ten-utils.js
 * License: MIT
 */
(function (global) {
  'use strict';

  const TEN = {
    version: '1.0.0',
    cdnBase: 'https://cdn.ten.my.id',

    /**
     * Copy text to system clipboard with fallback
     * @param {string} text 
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
      if (!text) return false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textarea);
          return successful;
        }
      } catch (err) {
        console.error('[TEN CDN] Gagal menyalin teks:', err);
        return false;
      }
    },

    /**
     * Display a floating toast notification
     * @param {string} message 
     * @param {'success'|'info'|'warning'|'error'} type 
     * @param {number} duration 
     */
    showToast(message, type = 'success', duration = 3000) {
      let toastContainer = document.getElementById('ten-toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'ten-toast-container';
        toastContainer.style.cssText = `
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 99999;
          pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
      }

      const colors = {
        success: { bg: '#10b981', border: '#059669', icon: '✓' },
        info: { bg: '#2563eb', border: '#1d4ed8', icon: 'ℹ' },
        warning: { bg: '#f59e0b', border: '#d97706', icon: '⚠' },
        error: { bg: '#ef4444', border: '#dc2626', icon: '✕' }
      };

      const style = colors[type] || colors.info;
      const toast = document.createElement('div');
      toast.style.cssText = `
        background: #0f172a;
        color: #ffffff;
        border-left: 4px solid ${style.bg};
        border-radius: 8px;
        padding: 12px 18px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transform: translateY(16px);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
      `;

      toast.innerHTML = `
        <span style="color: ${style.bg}; font-weight: bold; font-size: 16px;">${style.icon}</span>
        <span>${message}</span>
      `;

      toastContainer.appendChild(toast);

      // Trigger enter animation
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      // Remove after timeout
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(16px)';
        setTimeout(() => toast.remove(), 250);
      }, duration);
    },

    /**
     * Format byte number to human-readable string
     * @param {number} bytes 
     * @returns {string}
     */
    formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    /**
     * Debounce helper
     */
    debounce(func, wait = 250) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    },

    /**
     * Resolve full CDN URL
     */
    cdnUrl(path) {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `${this.cdnBase}${cleanPath}`;
    }
  };

  global.TEN = TEN;
})(typeof window !== 'undefined' ? window : this);
