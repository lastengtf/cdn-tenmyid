/**
 * CDN TEN - Portal Interactive Controller
 * Domain: cdn.ten.my.id
 */

document.addEventListener('DOMContentLoaded', () => {
  // Asset Registry Catalog
  const assets = [
    {
      id: 'logo-light',
      name: 'Logo TEN (Light Mode)',
      category: 'brand',
      type: 'svg',
      size: '1.4 KB',
      path: '/assets/brand/logo-ten.svg',
      desc: 'Logo resmi TEN-MY-ID untuk latar belakang terang / putih.',
      previewable: true,
      previewType: 'image'
    },
    {
      id: 'logo-dark',
      name: 'Logo TEN (Dark Mode)',
      category: 'brand',
      type: 'svg',
      size: '1.5 KB',
      path: '/assets/brand/logo-ten-dark.svg',
      desc: 'Logo resmi TEN-MY-ID untuk latar belakang gelap / malam.',
      previewable: true,
      previewType: 'image'
    },
    {
      id: 'favicon-svg',
      name: 'Favicon Icon Vektor',
      category: 'brand',
      type: 'svg',
      size: '560 B',
      path: '/favicon.svg',
      desc: 'Ikon kotak favicon TEN resolusi tajam berbasis SVG.',
      previewable: true,
      previewType: 'image'
    },
    {
      id: 'core-css',
      name: 'TEN Core CSS (Latest)',
      category: 'css',
      type: 'css',
      size: '4.8 KB',
      path: '/assets/css/ten-core.css',
      desc: 'Shared utility styling, reset modern, buttons, dan glassmorphism card.',
      previewable: true,
      previewType: 'code'
    },
    {
      id: 'core-css-v1',
      name: 'TEN Core CSS v1.0.0 (Immutable)',
      category: 'css',
      type: 'css',
      size: '4.8 KB',
      path: '/v1/css/ten-core.css',
      desc: 'Versi tetap immutable v1 untuk kompatibilitas jangka panjang tanpa cache buster.',
      previewable: true,
      previewType: 'code'
    },
    {
      id: 'utils-js',
      name: 'TEN JavaScript Utilities',
      category: 'js',
      type: 'js',
      size: '3.2 KB',
      path: '/assets/js/ten-utils.js',
      desc: 'Library utility ringan: copy to clipboard, toast alert, format bytes, CDN URL resolver.',
      previewable: true,
      previewType: 'code'
    },
    {
      id: 'utils-js-v1',
      name: 'TEN JS Utils v1.0.0 (Immutable)',
      category: 'js',
      type: 'js',
      size: '3.2 KB',
      path: '/v1/js/ten-utils.js',
      desc: 'Versi tetap immutable v1 untuk script JavaScript eksternal.',
      previewable: true,
      previewType: 'code'
    }
  ];

  // DOM Elements
  const assetsContainer = document.getElementById('assets-grid');
  const searchInput = document.getElementById('search-input');
  const filterChips = document.querySelectorAll('.filter-chip');
  const modal = document.getElementById('snippet-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalPreviewBox = document.getElementById('modal-preview-box');
  const snippetCode = document.getElementById('snippet-code');
  const snippetTabs = document.querySelectorAll('.snippet-tab');
  const copyModalBtn = document.getElementById('copy-modal-btn');
  const latencyBadge = document.getElementById('edge-latency');

  let currentCategory = 'all';
  let searchQuery = '';
  let activeAsset = null;
  let activeFormat = 'url'; // 'url' | 'html' | 'md' | 'css'

  // Measure initial edge latency
  if (latencyBadge) {
    const t0 = performance.now();
    fetch('/favicon.svg', { method: 'HEAD', cache: 'no-cache' })
      .then(() => {
        const ping = Math.round(performance.now() - t0);
        latencyBadge.textContent = `${ping} ms (Edge OK)`;
      })
      .catch(() => {
        latencyBadge.textContent = '< 20 ms (Global Anycast)';
      });
  }

  // Update Category Counts
  function updateCounts() {
    filterChips.forEach(chip => {
      const cat = chip.dataset.category;
      const countEl = chip.querySelector('.chip-count');
      if (cat === 'all') {
        countEl.textContent = assets.length;
      } else {
        const c = assets.filter(a => a.category === cat).length;
        countEl.textContent = c;
      }
    });
  }

  // Render Asset Cards
  function renderAssets() {
    const filtered = assets.filter(asset => {
      const matchCat = currentCategory === 'all' || asset.category === currentCategory;
      const matchSearch = 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      assetsContainer.innerHTML = `
        <div class="empty-state glass-panel">
          <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍 Aset Tidak Ditemukan</p>
          <p style="color: var(--text-dim); font-size: 0.9rem;">Tidak ada file aset yang sesuai dengan kata kunci "<strong>${escapeHtml(searchQuery)}</strong>"</p>
        </div>
      `;
      return;
    }

    const host = window.location.origin.includes('localhost') || window.location.origin.includes('file://')
      ? 'https://cdn.ten.my.id'
      : window.location.origin;

    assetsContainer.innerHTML = filtered.map(asset => {
      const fullUrl = `${host}${asset.path}`;
      return `
        <div class="asset-card glass-panel" data-id="${asset.id}">
          <div>
            <div class="asset-header">
              <span class="asset-type-badge badge-${asset.category}">
                ${asset.type}
              </span>
              <span class="asset-size">${asset.size}</span>
            </div>
            <h3 class="asset-name">${escapeHtml(asset.name)}</h3>
            <p class="asset-desc">${escapeHtml(asset.desc)}</p>
            <div class="asset-path-box" title="${fullUrl}">
              <span>${asset.path}</span>
            </div>
          </div>
          <div class="asset-actions">
            <button class="btn-snippet" onclick="window.openSnippetModal('${asset.id}')">
              <span>📋 Get Snippet</span>
            </button>
            <button class="btn-copy-direct" title="Salin Tautan Langsung" onclick="window.copyDirectUrl('${fullUrl}')">
              <span>Salin Link</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Generate Snippet Strings
  function generateSnippet(asset, format) {
    const host = window.location.origin.includes('localhost') || window.location.origin.includes('file://')
      ? 'https://cdn.ten.my.id'
      : window.location.origin;
    const url = `${host}${asset.path}`;

    switch (format) {
      case 'url':
        return url;
      case 'html':
        if (asset.type === 'css') {
          return `<link rel="stylesheet" href="${url}">`;
        } else if (asset.type === 'js') {
          return `<script src="${url}"></script>`;
        } else if (asset.type === 'svg' || asset.type === 'webp' || asset.type === 'png' || asset.type === 'jpg') {
          return `<img src="${url}" alt="${escapeHtml(asset.name)}" loading="lazy">`;
        }
        return `<a href="${url}" target="_blank">${escapeHtml(asset.name)}</a>`;
      case 'md':
        if (asset.type === 'svg' || asset.type === 'webp' || asset.type === 'png' || asset.type === 'jpg') {
          return `![${asset.name}](${url})`;
        }
        return `[${asset.name}](${url})`;
      case 'css':
        if (asset.type === 'css') {
          return `@import url('${url}');`;
        }
        return `background-image: url('${url}');`;
      default:
        return url;
    }
  }

  // Open Snippet Modal
  window.openSnippetModal = function(assetId) {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    activeAsset = asset;
    modalTitle.textContent = asset.name;

    // Render Preview
    const host = window.location.origin.includes('localhost') || window.location.origin.includes('file://')
      ? 'https://cdn.ten.my.id'
      : window.location.origin;
    const url = `${host}${asset.path}`;

    if (asset.previewType === 'image') {
      modalPreviewBox.style.display = 'flex';
      modalPreviewBox.innerHTML = `<img src="${asset.path}" alt="${asset.name}" class="modal-preview-img" onerror="this.src='/favicon.svg'">`;
    } else {
      modalPreviewBox.style.display = 'none';
    }

    updateSnippetView();
    modal.classList.add('open');
  };

  // Update Snippet View inside modal
  function updateSnippetView() {
    if (!activeAsset) return;
    const code = generateSnippet(activeAsset, activeFormat);
    snippetCode.textContent = code;
  }

  // Direct Copy Helper
  window.copyDirectUrl = async function(url) {
    const success = await copyText(url);
    if (success) {
      notify('Tautan berhasil disalin ke clipboard!', 'success');
    }
  };

  // Copy inside modal
  if (copyModalBtn) {
    copyModalBtn.addEventListener('click', async () => {
      if (!snippetCode) return;
      const text = snippetCode.textContent;
      const success = await copyText(text);
      if (success) {
        notify('Snippet kode berhasil disalin!', 'success');
        copyModalBtn.textContent = '✓ Tersalin!';
        setTimeout(() => {
          copyModalBtn.textContent = 'Salin Kode';
        }, 1500);
      }
    });
  }

  // Snippet Tab switching
  snippetTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      snippetTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFormat = tab.dataset.format;
      updateSnippetView();
    });
  });

  // Modal Close
  function closeModal() {
    modal.classList.remove('open');
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  // Category Filter clicks
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.category;
      renderAssets();
    });
  });

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderAssets();
    });
  }

  // Helper: copy to clipboard
  async function copyText(text) {
    if (window.TEN && window.TEN.copyToClipboard) {
      return await window.TEN.copyToClipboard(text);
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  // Helper: Toast notify
  function notify(msg, type = 'success') {
    if (window.TEN && window.TEN.showToast) {
      window.TEN.showToast(msg, type);
    } else {
      alert(msg);
    }
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Boot
  updateCounts();
  renderAssets();
});
