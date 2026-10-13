/**
 * CDN TEN - Portal Interactive Controller with Cloudflare KV Support
 * Domain: cdn.ten.my.id
 */

document.addEventListener('DOMContentLoaded', () => {
  // Default Seed Assets (Fallback if KV not yet populated)
  let assets = [
    {
      id: 'logo-light',
      name: 'Logo TEN (Light Mode)',
      category: 'brand',
      type: 'svg',
      size: '1.4 KB',
      path: '/assets/brand/logo-ten.svg',
      desc: 'Logo resmi TEN-MY-ID untuk latar belakang terang / putih.',
      previewable: true,
      previewType: 'image',
      source: 'static'
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
      previewType: 'image',
      source: 'static'
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
      previewType: 'image',
      source: 'static'
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
      previewType: 'code',
      source: 'static'
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
      previewType: 'code',
      source: 'static'
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
      previewType: 'code',
      source: 'static'
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
      previewType: 'code',
      source: 'static'
    }
  ];

  // DOM Elements
  const assetsContainer = document.getElementById('assets-grid');
  const searchInput = document.getElementById('search-input');
  const filterChips = document.querySelectorAll('.filter-chip');
  
  // Snippet Modal Elements
  const modal = document.getElementById('snippet-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalTitle = document.getElementById('modal-title');
  const modalPreviewBox = document.getElementById('modal-preview-box');
  const snippetCode = document.getElementById('snippet-code');
  const snippetTabs = document.querySelectorAll('.snippet-tab');
  const copyModalBtn = document.getElementById('copy-modal-btn');
  const latencyBadge = document.getElementById('edge-latency');

  // Upload Modal Elements
  const uploadModal = document.getElementById('upload-modal');
  const btnOpenUpload = document.getElementById('btn-open-upload-modal');
  const uploadCloseBtn = document.getElementById('upload-close-btn');
  const uploadCancelBtn = document.getElementById('upload-cancel-btn');
  const uploadForm = document.getElementById('upload-form');
  const radioTypeText = document.getElementById('radio-type-text');
  const radioTypeFile = document.getElementById('radio-type-file');
  const groupContentText = document.getElementById('group-content-text');
  const groupContentFile = document.getElementById('group-content-file');
  const inputAssetName = document.getElementById('input-asset-name');
  const inputAssetSlug = document.getElementById('input-asset-slug');

  let currentCategory = 'all';
  let searchQuery = '';
  let activeAsset = null;
  let activeFormat = 'url';

  // Measure Edge Latency & Fetch dynamic KV assets
  async function init() {
    if (latencyBadge) {
      const t0 = performance.now();
      fetch('/favicon.svg', { method: 'HEAD', cache: 'no-cache' })
        .then(() => {
          const ping = Math.round(performance.now() - t0);
          latencyBadge.textContent = `${ping} ms (Cloudflare Edge)`;
        })
        .catch(() => {
          latencyBadge.textContent = '< 20 ms (Global Anycast)';
        });
    }

    // Fetch dynamic assets from Cloudflare KV API
    await fetchAssetsFromKV();
  }

  // Fetch Assets from KV Endpoint (/api/assets)
  async function fetchAssetsFromKV() {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          assets = json.data;
          console.log(`[CDN TEN] Berhasil memuat ${assets.length} aset dari database KV.`);
        }
      }
    } catch (err) {
      console.warn('[CDN TEN] Berjalan dengan fallback static catalog:', err);
    } finally {
      updateCounts();
      renderAssets();
    }
  }

  // Update Category Counts
  function updateCounts() {
    filterChips.forEach(chip => {
      const cat = chip.dataset.category;
      const countEl = chip.querySelector('.chip-count');
      if (countEl) {
        if (cat === 'all') {
          countEl.textContent = assets.length;
        } else {
          const c = assets.filter(a => a.category === cat).length;
          countEl.textContent = c;
        }
      }
    });
  }

  // Render Asset Cards
  function renderAssets() {
    if (!assetsContainer) return;

    const filtered = assets.filter(asset => {
      const matchCat = currentCategory === 'all' || asset.category === currentCategory;
      const matchSearch = 
        (asset.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.path || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.desc || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.slug || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      assetsContainer.innerHTML = `
        <div class="empty-state glass-panel">
          <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍 Aset Tidak Ditemukan</p>
          <p style="color: var(--text-dim); font-size: 0.9rem;">Tidak ada file aset yang sesuai dengan kriteria "<strong>${escapeHtml(searchQuery)}</strong>"</p>
        </div>
      `;
      return;
    }

    const host = window.location.origin.includes('localhost') || window.location.origin.includes('file://')
      ? 'https://cdn.ten.my.id'
      : window.location.origin;

    assetsContainer.innerHTML = filtered.map(asset => {
      const fullUrl = `${host}${asset.path}`;
      const isKv = asset.source === 'kv' || (asset.path && asset.path.startsWith('/raw/'));

      return `
        <div class="asset-card glass-panel" data-id="${asset.id}">
          <div>
            <div class="asset-header">
              <div style="display: flex; gap: 0.4rem; align-items: center;">
                <span class="asset-type-badge badge-${asset.category || 'code'}">
                  ${asset.type || 'file'}
                </span>
                ${isKv ? '<span class="badge-kv" title="Tersimpan langsung di Cloudflare KV">KV STORE</span>' : ''}
              </div>
              <span class="asset-size">${asset.size || '-'}</span>
            </div>
            <h3 class="asset-name">${escapeHtml(asset.name)}</h3>
            <p class="asset-desc">${escapeHtml(asset.desc || '')}</p>
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
        } else if (['svg', 'webp', 'png', 'jpg', 'jpeg'].includes(asset.type)) {
          return `<img src="${url}" alt="${escapeHtml(asset.name)}" loading="lazy">`;
        }
        return `<a href="${url}" target="_blank">${escapeHtml(asset.name)}</a>`;
      case 'md':
        if (['svg', 'webp', 'png', 'jpg', 'jpeg'].includes(asset.type)) {
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

    if (asset.previewType === 'image' || ['svg', 'png', 'webp', 'jpg'].includes(asset.type)) {
      modalPreviewBox.style.display = 'flex';
      modalPreviewBox.innerHTML = `<img src="${asset.path}" alt="${asset.name}" class="modal-preview-img" onerror="this.src='/favicon.svg'">`;
    } else {
      modalPreviewBox.style.display = 'none';
    }

    updateSnippetView();
    modal.classList.add('open');
  };

  function updateSnippetView() {
    if (!activeAsset) return;
    const code = generateSnippet(activeAsset, activeFormat);
    snippetCode.textContent = code;
  }

  window.copyDirectUrl = async function(url) {
    const success = await copyText(url);
    if (success) {
      notify('Tautan aset CDN berhasil disalin!', 'success');
    }
  };

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

  snippetTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      snippetTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFormat = tab.dataset.format;
      updateSnippetView();
    });
  });

  // Modal Closures
  function closeSnippetModal() {
    modal.classList.remove('open');
  }
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSnippetModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSnippetModal();
    });
  }

  // Upload Modal Controllers
  function openUploadModal() {
    if (uploadModal) uploadModal.classList.add('open');
  }
  function closeUploadModal() {
    if (uploadModal) uploadModal.classList.remove('open');
  }
  if (btnOpenUpload) btnOpenUpload.addEventListener('click', openUploadModal);
  if (uploadCloseBtn) uploadCloseBtn.addEventListener('click', closeUploadModal);
  if (uploadCancelBtn) uploadCancelBtn.addEventListener('click', closeUploadModal);
  if (uploadModal) {
    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) closeUploadModal();
    });
  }

  // Toggle Input Type (Text vs File)
  if (radioTypeText && radioTypeFile) {
    radioTypeText.addEventListener('change', () => {
      if (radioTypeText.checked) {
        groupContentText.style.display = 'block';
        groupContentFile.style.display = 'none';
      }
    });
    radioTypeFile.addEventListener('change', () => {
      if (radioTypeFile.checked) {
        groupContentText.style.display = 'none';
        groupContentFile.style.display = 'block';
      }
    });
  }

  // Auto infer slug from name
  if (inputAssetName && inputAssetSlug) {
    inputAssetName.addEventListener('input', () => {
      if (!inputAssetSlug.dataset.manual) {
        const val = inputAssetName.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const cat = document.getElementById('select-asset-category').value;
        const ext = cat === 'css' ? '.css' : (cat === 'js' ? '.js' : '');
        inputAssetSlug.value = `${cat}/${val}${ext}`;
      }
    });
    inputAssetSlug.addEventListener('input', () => {
      inputAssetSlug.dataset.manual = 'true';
    });
  }

  // Upload Form Submission to Cloudflare KV
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('upload-submit-btn');
      const apiKey = document.getElementById('input-api-key').value;
      const isFile = radioTypeFile && radioTypeFile.checked;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Menyimpan ke KV...</span>';

      try {
        let response;
        if (isFile) {
          const fileInput = document.getElementById('input-file');
          if (!fileInput.files || fileInput.files.length === 0) {
            throw new Error('Pilih berkas yang ingin diupload.');
          }
          const formData = new FormData();
          formData.append('name', inputAssetName.value);
          formData.append('category', document.getElementById('select-asset-category').value);
          formData.append('slug', inputAssetSlug.value);
          formData.append('desc', document.getElementById('input-asset-desc').value);
          formData.append('file', fileInput.files[0]);

          response = await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData
          });
        } else {
          const payload = {
            name: inputAssetName.value,
            category: document.getElementById('select-asset-category').value,
            slug: inputAssetSlug.value,
            desc: document.getElementById('input-asset-desc').value,
            content: document.getElementById('textarea-content').value
          };

          response = await fetch('/api/assets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
          });
        }

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Gagal menyimpan ke KV');
        }

        notify('Aset berhasil disimpan ke database Cloudflare KV!', 'success');
        uploadForm.reset();
        delete inputAssetSlug.dataset.manual;
        closeUploadModal();
        await fetchAssetsFromKV();

      } catch (err) {
        notify(`Error: ${err.message}`, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Simpan ke KV</span>';
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSnippetModal();
      closeUploadModal();
    }
  });

  // Filter Chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.category;
      renderAssets();
    });
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderAssets();
    });
  }

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

  function notify(msg, type = 'success') {
    if (window.TEN && window.TEN.showToast) {
      window.TEN.showToast(msg, type);
    } else {
      alert(msg);
    }
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Boot
  init();
});
