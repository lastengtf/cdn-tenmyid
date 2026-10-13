/**
 * CDN TEN - Client Application Controller
 * Domain: cdn.ten.my.id
 */

document.addEventListener('DOMContentLoaded', () => {
  // Base configuration
  const CDN_DOMAIN = 'cdn.ten.my.id';
  const BASE_URL = window.location.origin;

  // State
  let state = {
    token: localStorage.getItem('cdn_token') || '',
    email: '',
    assets: [],
    filterCategory: 'ALL',
    searchQuery: '',
    selectedFile: null,
    uploadMode: 'file' // 'file' | 'code'
  };

  // Elements - Views
  const viewLogin = document.getElementById('view-login');
  const viewAdmin = document.getElementById('view-admin');

  // Elements - Auth
  const formLogin = document.getElementById('form-login');
  const inputEmail = document.getElementById('login-email');
  const inputPassword = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  const btnTogglePassword = document.getElementById('btn-toggle-password');
  const btnLogout = document.getElementById('btn-logout');
  const userEmailDisplay = document.getElementById('user-email-display');

  // Elements - Admin Dashboard
  const inputSearch = document.getElementById('input-search');
  const categoryFilterList = document.getElementById('category-filter-list');
  const assetsTableBody = document.getElementById('assets-table-body');
  const assetsEmptyState = document.getElementById('assets-empty-state');
  const btnOpenUpload = document.getElementById('btn-open-upload');

  // Elements - Upload Modal
  const modalUpload = document.getElementById('modal-upload');
  const btnCloseUploadModal = document.getElementById('btn-close-upload-modal');
  const btnCancelUpload = document.getElementById('btn-cancel-upload');
  const tabModeFile = document.getElementById('tab-mode-file');
  const tabModeCode = document.getElementById('tab-mode-code');
  const sectionFileInput = document.getElementById('section-file-input');
  const sectionCodeInput = document.getElementById('section-code-input');
  const fileDropzone = document.getElementById('file-dropzone');
  const inputFile = document.getElementById('input-file');
  const dropzoneLabel = document.getElementById('dropzone-label');
  const inputCodeContent = document.getElementById('input-code-content');
  const formUploadAsset = document.getElementById('form-upload-asset');
  const inputAssetName = document.getElementById('input-asset-name');
  const selectAssetCategory = document.getElementById('select-asset-category');
  const inputRandomSlug = document.getElementById('input-random-slug');
  const btnRefreshSlug = document.getElementById('btn-refresh-slug');
  const inputCustomPath = document.getElementById('input-custom-path');
  const btnSubmitUpload = document.getElementById('btn-submit-upload');

  // Elements - Edit Modal
  const modalEdit = document.getElementById('modal-edit');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const formEditAsset = document.getElementById('form-edit-asset');
  const editAssetId = document.getElementById('edit-asset-id');
  const editAssetName = document.getElementById('edit-asset-name');
  const editAssetCategory = document.getElementById('edit-asset-category');
  const editCustomPath = document.getElementById('edit-custom-path');
  const btnSubmitEdit = document.getElementById('btn-submit-edit');

  // Elements - Preview Modal
  const modalPreview = document.getElementById('modal-preview');
  const btnClosePreviewModal = document.getElementById('btn-close-preview-modal');
  const previewTitle = document.getElementById('preview-title');
  const previewCategoryTag = document.getElementById('preview-category-tag');
  const previewMediaContainer = document.getElementById('preview-media-container');
  const previewRandomUrl = document.getElementById('preview-random-url');
  const previewOpenRandom = document.getElementById('preview-open-random');
  const previewCustomUrlGroup = document.getElementById('preview-custom-url-group');
  const previewCustomUrl = document.getElementById('preview-custom-url');
  const previewOpenCustom = document.getElementById('preview-open-custom');
  const previewEmbedSnippet = document.getElementById('preview-embed-snippet');

  // Elements - Toast
  const toast = document.getElementById('toast');

  /* =========================================================================
     1. Inisialisasi & Pemeriksaan Autentikasi
     ========================================================================= */

  checkAuth();

  async function checkAuth() {
    try {
      const res = await apiRequest('/api/auth/me', 'GET');
      if (res && res.authenticated) {
        state.email = res.email || 'admin';
        showAdminView();
        loadAssets();
      } else {
        showLoginView();
      }
    } catch {
      showLoginView();
    }
  }

  function showLoginView() {
    viewLogin.style.display = 'flex';
    viewAdmin.style.display = 'none';
    closeAllModals();
  }

  function showAdminView() {
    viewLogin.style.display = 'none';
    viewAdmin.style.display = 'flex';
    userEmailDisplay.textContent = state.email || 'admin';
  }

  /* =========================================================================
     2. Form Login & Logout
     ========================================================================= */

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.style.display = 'none';
      btnSubmitLogin.disabled = true;
      btnSubmitLogin.querySelector('.btn-label').textContent = 'Memverifikasi...';

      const email = inputEmail.value.trim();
      const password = inputPassword.value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          state.token = data.token;
          state.email = data.email || email;
          localStorage.setItem('cdn_token', data.token);
          formLogin.reset();
          showAdminView();
          loadAssets();
          showToast('Login berhasil! Selamat datang.');
        } else {
          showLoginError(data.error || 'Email atau password salah.');
        }
      } catch (err) {
        showLoginError('Terjadi kesalahan jaringan: ' + err.message);
      } finally {
        btnSubmitLogin.disabled = false;
        btnSubmitLogin.querySelector('.btn-label').textContent = 'Masuk ke Dashboard';
      }
    });
  }

  if (btnTogglePassword) {
    btnTogglePassword.addEventListener('click', () => {
      const isPass = inputPassword.type === 'password';
      inputPassword.type = isPass ? 'text' : 'password';
      const eyeShow = btnTogglePassword.querySelector('.icon-eye-show');
      const eyeHide = btnTogglePassword.querySelector('.icon-eye-hide');
      if (eyeShow && eyeHide) {
        eyeShow.style.display = isPass ? 'none' : 'block';
        eyeHide.style.display = isPass ? 'block' : 'none';
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('Yakin ingin keluar dari dashboard CDN?')) {
        try {
          await apiRequest('/api/auth/logout', 'POST');
        } catch {}
        state.token = '';
        state.email = '';
        localStorage.removeItem('cdn_token');
        showLoginView();
        showToast('Anda telah keluar.');
      }
    });
  }

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
  }

  /* =========================================================================
     3. Manajemen Aset (Fetch & Render)
     ========================================================================= */

  async function loadAssets() {
    try {
      const res = await apiRequest('/api/assets', 'GET');
      if (res && res.success) {
        state.assets = res.data || [];
        renderDashboard();
      }
    } catch (err) {
      console.error('Error loading assets:', err);
    }
  }

  function renderDashboard() {
    // 1. Filter & Search
    const filtered = state.assets.filter(item => {
      const matchCat = state.filterCategory === 'ALL' || item.category === state.filterCategory;
      if (!matchCat) return false;

      if (!state.searchQuery) return true;
      const q = state.searchQuery.toLowerCase();
      const name = (item.name || '').toLowerCase();
      const slug = (item.randomSlug || '').toLowerCase();
      const custom = (item.customPath || '').toLowerCase();
      return name.includes(q) || slug.includes(q) || custom.includes(q);
    });

    // 2. Render Table
    if (filtered.length === 0) {
      assetsTableBody.innerHTML = '';
      assetsEmptyState.style.display = 'flex';
      return;
    }

    assetsEmptyState.style.display = 'none';
    assetsTableBody.innerHTML = filtered.map(item => {
      const randomUrl = `${BASE_URL}/${item.randomSlug}`;
      const customUrl = item.customPath ? `${BASE_URL}/${item.customPath}` : '';

      return `
        <tr data-id="${item.id}">
          <td>
            <div class="cell-asset-info">
              <div class="cell-thumb">
                ${getAssetThumbnail(item)}
              </div>
              <div style="min-width: 0;">
                <div class="cell-title">${escapeHtml(item.name)}</div>
                <div class="cell-sub">${escapeHtml(item.fileName || item.id)}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge-cat">${escapeHtml(item.category || 'Lainnya')}</span>
          </td>
          <td>
            <div class="url-chip">
              <span class="url-chip-path">/${item.randomSlug}</span>
              <div class="url-chip-actions">
                <button class="btn-chip-action" onclick="copyText('${randomUrl}')" title="Salin URL Acak">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <a href="/${item.randomSlug}" target="_blank" class="btn-chip-action" title="Buka di tab baru">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              </div>
            </div>
          </td>
          <td>
            ${item.customPath ? `
              <div class="url-chip">
                <span class="url-chip-path">/${escapeHtml(item.customPath)}</span>
                <div class="url-chip-actions">
                  <button class="btn-chip-action" onclick="copyText('${customUrl}')" title="Salin Custom Path">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                  <a href="/${item.customPath}" target="_blank" class="btn-chip-action" title="Buka di tab baru">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  </a>
                </div>
              </div>
            ` : '<span style="color: var(--text-dim); font-size: 11px;">—</span>'}
          </td>
          <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); white-space: nowrap;">
            ${item.sizeFormatted || formatBytes(item.sizeBytes || 0)}
          </td>
          <td class="text-right">
            <div class="cell-actions-row">
              <button class="btn-icon-only" onclick="openPreviewModal('${item.id}')" title="Preview Aset">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
              <button class="btn-icon-only" onclick="openEditModal('${item.id}')" title="Edit Metadata">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button class="btn-icon-only btn-delete" onclick="deleteAsset('${item.id}', '${escapeHtml(item.name)}')" title="Hapus Aset">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function getAssetThumbnail(item) {
    const isImage = (item.mimeType || '').startsWith('image/') || ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(item.extension);
    if (isImage) {
      return `<img src="/${item.randomSlug}" alt="" loading="lazy">`;
    }
    if ((item.mimeType || '').startsWith('video/')) {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
    }
    if (item.category === 'CSS' || item.extension === 'css') {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>`;
    }
    if (item.category === 'Script' || ['js', 'mjs', 'ts'].includes(item.extension)) {
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    }
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
  }

  // Filter Category Pills
  if (categoryFilterList) {
    categoryFilterList.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-pill');
      if (!btn) return;

      categoryFilterList.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.filterCategory = btn.getAttribute('data-category') || 'ALL';
      renderDashboard();
    });
  }

  // Search Input
  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderDashboard();
    });
  }

  /* =========================================================================
     4. Upload Modal & Actions
     ========================================================================= */

  if (btnOpenUpload) {
    btnOpenUpload.addEventListener('click', () => openUploadModal());
  }

  document.querySelectorAll('.btn-open-upload-trigger').forEach(b => {
    b.addEventListener('click', () => openUploadModal());
  });

  function openUploadModal() {
    formUploadAsset.reset();
    state.selectedFile = null;
    dropzoneLabel.textContent = 'Pilih file atau seret file ke sini';
    setUploadMode('file');
    inputRandomSlug.value = generateRandomSlug();
    modalUpload.style.display = 'flex';
  }

  function setUploadMode(mode) {
    state.uploadMode = mode;
    if (mode === 'file') {
      tabModeFile.classList.add('active');
      tabModeCode.classList.remove('active');
      sectionFileInput.style.display = 'block';
      sectionCodeInput.style.display = 'none';
    } else {
      tabModeFile.classList.remove('active');
      tabModeCode.classList.add('active');
      sectionFileInput.style.display = 'none';
      sectionCodeInput.style.display = 'block';
      selectAssetCategory.value = 'Script';
    }
  }

  if (tabModeFile) tabModeFile.addEventListener('click', () => setUploadMode('file'));
  if (tabModeCode) tabModeCode.addEventListener('click', () => setUploadMode('code'));

  if (btnCloseUploadModal) btnCloseUploadModal.addEventListener('click', () => modalUpload.style.display = 'none');
  if (btnCancelUpload) btnCancelUpload.addEventListener('click', () => modalUpload.style.display = 'none');

  if (btnRefreshSlug) {
    btnRefreshSlug.addEventListener('click', () => {
      inputRandomSlug.value = generateRandomSlug();
    });
  }

  // File Dropzone Handlers
  if (inputFile) {
    inputFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileSelected(file);
    });
  }

  if (fileDropzone) {
    fileDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropzone.classList.add('dragover');
    });
    fileDropzone.addEventListener('dragleave', () => {
      fileDropzone.classList.remove('dragover');
    });
    fileDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });
  }

  function handleFileSelected(file) {
    state.selectedFile = file;
    dropzoneLabel.textContent = `${file.name} (${formatBytes(file.size)})`;

    // Auto-fill nama aset jika kosong
    if (!inputAssetName.value.trim()) {
      inputAssetName.value = file.name.replace(/\.[^/.]+$/, '');
    }

    // Auto-detect kategori
    const type = file.type || '';
    const ext = file.name.split('.').pop().toLowerCase();
    if (type.startsWith('image/') || ['svg', 'png', 'jpg', 'webp', 'ico'].includes(ext)) {
      selectAssetCategory.value = 'Gambar';
    } else if (type.startsWith('video/') || ['mp4', 'webm'].includes(ext)) {
      selectAssetCategory.value = 'Video';
    } else if (['js', 'mjs', 'ts'].includes(ext)) {
      selectAssetCategory.value = 'Script';
    } else if (ext === 'css') {
      selectAssetCategory.value = 'CSS';
    } else if (['pdf', 'doc', 'docx', 'zip'].includes(ext)) {
      selectAssetCategory.value = 'Dokumen';
    }
  }

  // Handle Form Upload Submit
  if (formUploadAsset) {
    formUploadAsset.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = inputAssetName.value.trim();
      const category = selectAssetCategory.value;
      const randomSlug = inputRandomSlug.value.trim().toLowerCase();
      const customPath = inputCustomPath.value.trim();

      if (!name) {
        alert('Nama aset wajib diisi.');
        return;
      }
      if (!randomSlug) {
        alert('Karakter acak wajib diisi.');
        return;
      }

      btnSubmitUpload.disabled = true;
      btnSubmitUpload.querySelector('.btn-label').textContent = 'Mengunggah ke KV...';

      try {
        let res;
        if (state.uploadMode === 'file') {
          if (!state.selectedFile) {
            alert('Silakan pilih berkas file yang akan diunggah.');
            btnSubmitUpload.disabled = false;
            btnSubmitUpload.querySelector('.btn-label').textContent = 'Simpan ke CDN';
            return;
          }

          const formData = new FormData();
          formData.append('name', name);
          formData.append('category', category);
          formData.append('randomSlug', randomSlug);
          if (customPath) formData.append('customPath', customPath);
          formData.append('file', state.selectedFile);

          res = await fetch('/api/assets', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${state.token}`
            },
            body: formData
          });
        } else {
          // Direct Text / Code
          const content = inputCodeContent.value;
          if (!content) {
            alert('Konten kode / teks tidak boleh kosong.');
            btnSubmitUpload.disabled = false;
            btnSubmitUpload.querySelector('.btn-label').textContent = 'Simpan ke CDN';
            return;
          }

          let mimeType = 'text/plain; charset=utf-8';
          if (category === 'CSS') mimeType = 'text/css; charset=utf-8';
          if (category === 'Script') mimeType = 'application/javascript; charset=utf-8';

          res = await fetch('/api/assets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({
              name,
              category,
              randomSlug,
              customPath,
              content,
              mimeType
            })
          });
        }

        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Aset berhasil disimpan ke CDN!');
          modalUpload.style.display = 'none';
          loadAssets();
        } else {
          alert('Gagal mengunggah: ' + (data.error || 'Terjadi kesalahan'));
        }
      } catch (err) {
        alert('Gagal mengunggah aset: ' + err.message);
      } finally {
        btnSubmitUpload.disabled = false;
        btnSubmitUpload.querySelector('.btn-label').textContent = 'Simpan ke CDN';
      }
    });
  }

  /* =========================================================================
     5. Edit Modal & Actions
     ========================================================================= */

  window.openEditModal = function(id) {
    const item = state.assets.find(a => a.id === id);
    if (!item) return;

    editAssetId.value = item.id;
    editAssetName.value = item.name || '';
    editAssetCategory.value = item.category || 'Lainnya';
    editCustomPath.value = item.customPath || '';

    modalEdit.style.display = 'flex';
  };

  if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', () => modalEdit.style.display = 'none');
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => modalEdit.style.display = 'none');

  if (formEditAsset) {
    formEditAsset.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editAssetId.value;
      const name = editAssetName.value.trim();
      const category = editAssetCategory.value;
      const customPath = editCustomPath.value.trim();

      btnSubmitEdit.disabled = true;
      btnSubmitEdit.querySelector('.btn-label').textContent = 'Menyimpan...';

      try {
        const res = await apiRequest(`/api/assets/${encodeURIComponent(id)}`, 'PUT', {
          name,
          category,
          customPath
        });

        if (res && res.success) {
          showToast('Metadata aset berhasil diperbarui.');
          modalEdit.style.display = 'none';
          loadAssets();
        } else {
          alert('Gagal update: ' + (res.error || 'Terjadi kesalahan'));
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btnSubmitEdit.disabled = false;
        btnSubmitEdit.querySelector('.btn-label').textContent = 'Simpan Perubahan';
      }
    });
  }

  /* =========================================================================
     6. Delete Action
     ========================================================================= */

  window.deleteAsset = async function(id, name) {
    if (!confirm(`Hapus permanen aset "${name}" dari CDN dan Cloudflare KV?`)) {
      return;
    }

    try {
      const res = await apiRequest(`/api/assets/${encodeURIComponent(id)}`, 'DELETE');
      if (res && res.success) {
        showToast(`Aset "${name}" berhasil dihapus.`);
        loadAssets();
      } else {
        alert('Gagal menghapus: ' + (res.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      alert('Error saat menghapus: ' + err.message);
    }
  };

  /* =========================================================================
     7. Preview Modal
     ========================================================================= */

  window.openPreviewModal = async function(id) {
    const item = state.assets.find(a => a.id === id);
    if (!item) return;

    previewTitle.textContent = item.name;
    previewCategoryTag.textContent = item.category || 'Aset';

    const randomUrl = `${BASE_URL}/${item.randomSlug}`;
    previewRandomUrl.value = randomUrl;
    previewOpenRandom.href = `/${item.randomSlug}`;

    if (item.customPath) {
      const customUrl = `${BASE_URL}/${item.customPath}`;
      previewCustomUrl.value = customUrl;
      previewOpenCustom.href = `/${item.customPath}`;
      previewCustomUrlGroup.style.display = 'flex';
    } else {
      previewCustomUrlGroup.style.display = 'none';
    }

    // Media Renderer
    previewMediaContainer.innerHTML = '<div style="color: var(--text-dim);">Memuat preview...</div>';

    const mime = item.mimeType || '';
    const ext = (item.extension || '').toLowerCase();
    const activeUrl = item.customPath ? `/${item.customPath}` : `/${item.randomSlug}`;

    let embedCode = `<a href="${randomUrl}" target="_blank">Lihat Aset</a>`;

    if (mime.startsWith('image/') || ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      previewMediaContainer.innerHTML = `<img src="${activeUrl}" alt="${escapeHtml(item.name)}">`;
      embedCode = `<img src="${randomUrl}" alt="${escapeHtml(item.name)}" loading="lazy">`;
    } else if (mime.startsWith('video/') || ['mp4', 'webm'].includes(ext)) {
      previewMediaContainer.innerHTML = `<video src="${activeUrl}" controls autoplay muted playsinline></video>`;
      embedCode = `<video src="${randomUrl}" controls playsinline></video>`;
    } else if (['css'].includes(ext) || item.category === 'CSS') {
      embedCode = `<link rel="stylesheet" href="${randomUrl}">`;
      loadTextPreview(activeUrl);
    } else if (['js', 'mjs'].includes(ext) || item.category === 'Script') {
      embedCode = `<script src="${randomUrl}" defer></script>`;
      loadTextPreview(activeUrl);
    } else if (['json', 'txt', 'html'].includes(ext)) {
      embedCode = randomUrl;
      loadTextPreview(activeUrl);
    } else {
      embedCode = `<a href="${randomUrl}" download>Unduh ${escapeHtml(item.name)}</a>`;
      previewMediaContainer.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 40px; margin-bottom: 8px;">📄</div>
          <p style="font-weight: 600;">${escapeHtml(item.name)}</p>
          <small style="color: var(--text-dim);">${item.sizeFormatted}</small>
        </div>
      `;
    }

    previewEmbedSnippet.value = embedCode;
    modalPreview.style.display = 'flex';
  };

  async function loadTextPreview(url) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      previewMediaContainer.innerHTML = `<pre><code>${escapeHtml(text.slice(0, 3000))}</code></pre>`;
    } catch {
      previewMediaContainer.innerHTML = `<div style="color: var(--text-dim);">Tidak dapat menampilkan teks preview</div>`;
    }
  }

  if (btnClosePreviewModal) btnClosePreviewModal.addEventListener('click', () => modalPreview.style.display = 'none');

  /* =========================================================================
     8. Utility Functions & Copy
     ========================================================================= */

  window.copyText = function(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast('Tautan berhasil disalin ke clipboard!');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Tautan berhasil disalin!');
    });
  };

  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) copyText(input.value);
    });
  });

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  function generateRandomSlug(length = 7) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function closeAllModals() {
    if (modalUpload) modalUpload.style.display = 'none';
    if (modalEdit) modalEdit.style.display = 'none';
    if (modalPreview) modalPreview.style.display = 'none';
  }

  async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {};
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(endpoint, options);
    if (res.status === 401) {
      state.token = '';
      localStorage.removeItem('cdn_token');
      showLoginView();
      return null;
    }
    return res.json();
  }
});
