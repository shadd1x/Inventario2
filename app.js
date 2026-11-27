// Inventario PWA - App principal
const PLATFORM_ORDER = ['PS5', 'PS4', 'NINTENDO 2', 'NINTENDO', 'XBOX', 'CONSOLAS', 'ACCESORIOS'];
const PLATFORM_LABELS = {
  'PS5': 'PS5',
  'PS4': 'PS4',
  'NINTENDO 2': 'Switch 2',
  'NINTENDO': 'Switch',
  'XBOX': 'Xbox',
  'CONSOLAS': 'Consolas',
  'ACCESORIOS': 'Accesorios'
};

const STORAGE_KEY = 'inventario_data_v1';

let inventory = {};
let currentPlatform = 'ALL';
let searchQuery = '';
let exchangeRate = 6.96;
let ajusteBob = 0; // suma fija en Bs al precio mostrado

// DOM
const tabsEl = document.getElementById('tabs');
const contentEl = document.getElementById('content');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const rateInput = document.getElementById('rateInput');
const ajusteBobInput = document.getElementById('ajusteBobInput');
const statsEl = document.getElementById('stats');
const installBtn = document.getElementById('installBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const toastEl = document.getElementById('toast');

// Load rate & ajuste from localStorage
const savedRate = localStorage.getItem('usd_bob_rate');
if (savedRate) {
  exchangeRate = parseFloat(savedRate) || 6.96;
  rateInput.value = exchangeRate;
}
const savedAjuste = localStorage.getItem('ajuste_bob');
if (savedAjuste != null) {
  ajusteBob = parseFloat(savedAjuste) || 0;
  ajusteBobInput.value = ajusteBob;
}

// ========== Toast ==========
let toastTimer = null;
function showToast(msg, type = '') {
  toastEl.textContent = msg;
  toastEl.className = 'toast' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2800);
}

// ========== Persist ==========
function saveInventory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
  } catch (e) {
    console.warn('No se pudo guardar en localStorage', e);
    showToast('No se pudo guardar localmente', 'error');
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') return data;
    }
  } catch (e) {}
  return null;
}

// ========== Data ==========
async function loadInventory() {
  try {
    // Prefer local edits if they exist
    const local = loadFromStorage();
    if (local) {
      inventory = local;
      // Ensure all platforms exist
      for (const p of PLATFORM_ORDER) {
        if (!inventory[p]) inventory[p] = [];
      }
      renderTabs();
      renderContent();
      updateStats();
      return;
    }

    const res = await fetch('inventory.json');
    inventory = await res.json();
    for (const p of PLATFORM_ORDER) {
      if (!inventory[p]) inventory[p] = [];
    }
    renderTabs();
    renderContent();
    updateStats();
  } catch (err) {
    contentEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>Error cargando inventario</div>`;
    console.error(err);
  }
}

// ========== Tabs ==========
function renderTabs() {
  const totalItems = Object.values(inventory).reduce((s, arr) => s + arr.length, 0);
  let html = `<button class="tab ${currentPlatform === 'ALL' ? 'active' : ''}" data-platform="ALL">Todos <span class="count">(${totalItems})</span></button>`;

  for (const p of PLATFORM_ORDER) {
    const items = inventory[p] || [];
    if (items.length === 0 && p === 'ACCESORIOS') continue;
    const label = PLATFORM_LABELS[p] || p;
    html += `<button class="tab ${currentPlatform === p ? 'active' : ''}" data-platform="${p}">${label} <span class="count">(${items.length})</span></button>`;
  }
  tabsEl.innerHTML = html;

  tabsEl.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPlatform = btn.dataset.platform;
      renderTabs();
      renderContent();
    });
  });
}

// ========== Render ==========
function formatPrice(usd) {
  if (usd == null || isNaN(usd)) return '<span class="no-price">—</span>';
  const bobBase = usd * exchangeRate;
  const bob = (bobBase + ajusteBob).toFixed(0);
  return `
    <div class="price-usd">$${Number(usd).toFixed(0)}</div>
    <div class="price-bob">Bs ${bob}</div>
  `;
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  // Solo resalta el inicio del nombre
  const t = String(text);
  const q = query.trim();
  if (!q) return escapeHtml(t);
  if (t.toLowerCase().startsWith(q.toLowerCase())) {
    const matched = t.slice(0, q.length);
    const rest = t.slice(q.length);
    return `<span class="highlight">${escapeHtml(matched)}</span>${escapeHtml(rest)}`;
  }
  return escapeHtml(t);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Búsqueda solo por inicio del nombre (primera letra o prefijo), no por letras intermedias */
function filterItems(items, query) {
  if (!query) return items;
  const q = query.toLowerCase().trim();
  if (!q) return items;
  return items.filter(item => {
    const name = (item.nombre || '').toLowerCase();
    return name.startsWith(q);
  });
}

function renderGameCard(item, platform, index) {
  const qtyClass = item.cantidad > 0 ? 'has-stock' : 'no-stock';
  const outClass = item.cantidad === 0 ? 'out-of-stock' : '';
  const platformLabel = currentPlatform === 'ALL'
    ? `<div class="game-platform">${PLATFORM_LABELS[platform] || platform}</div>`
    : '';

  return `
    <article class="game-card ${outClass}" data-platform="${escapeHtml(platform)}" data-index="${index}" role="button" tabindex="0">
      <div class="qty ${qtyClass}">${item.cantidad}</div>
      <div class="game-info">
        <div class="game-name">${highlightText(item.nombre, searchQuery)}</div>
        ${platformLabel}
      </div>
      <div class="prices">
        ${formatPrice(item.precio_unitario)}
      </div>
    </article>
  `;
}

function renderContent() {
  let html = '';
  let totalShown = 0;

  if (currentPlatform === 'ALL') {
    for (const p of PLATFORM_ORDER) {
      const rawItems = inventory[p] || [];
      // Keep original indices for editing
      const indexed = rawItems.map((item, idx) => ({ item, idx }));
      const filtered = indexed.filter(({ item }) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase().trim();
        return (item.nombre || '').toLowerCase().startsWith(q);
      });
      if (filtered.length === 0) continue;
      totalShown += filtered.length;
      html += `<div class="section-title">${PLATFORM_LABELS[p] || p} (${filtered.length})</div>`;
      html += `<div class="game-list">`;
      filtered.sort((a, b) => {
        if (a.item.cantidad > 0 && b.item.cantidad === 0) return -1;
        if (a.item.cantidad === 0 && b.item.cantidad > 0) return 1;
        return (a.item.nombre || '').localeCompare(b.item.nombre || '');
      });
      for (const { item, idx } of filtered) {
        html += renderGameCard(item, p, idx);
      }
      html += `</div>`;
    }
  } else {
    const rawItems = inventory[currentPlatform] || [];
    const indexed = rawItems.map((item, idx) => ({ item, idx }));
    const filtered = indexed.filter(({ item }) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase().trim();
      return (item.nombre || '').toLowerCase().startsWith(q);
    });
    totalShown = filtered.length;
    if (filtered.length === 0) {
      html = `<div class="empty-state"><div class="icon">🔍</div>No se encontraron juegos</div>`;
    } else {
      filtered.sort((a, b) => {
        if (a.item.cantidad > 0 && b.item.cantidad === 0) return -1;
        if (a.item.cantidad === 0 && b.item.cantidad > 0) return 1;
        return (a.item.nombre || '').localeCompare(b.item.nombre || '');
      });
      html += `<div class="game-list">`;
      for (const { item, idx } of filtered) {
        html += renderGameCard(item, currentPlatform, idx);
      }
      html += `</div>`;
    }
  }

  if (totalShown === 0 && searchQuery) {
    html = `<div class="empty-state"><div class="icon">🔍</div>No hay resultados para "${escapeHtml(searchQuery)}"</div>`;
  } else if (totalShown === 0) {
    html = `<div class="empty-state"><div class="icon">📦</div>Sin productos en esta sección</div>`;
  }

  contentEl.innerHTML = html;
  updateStats(totalShown);

  // Click to edit
  contentEl.querySelectorAll('.game-card').forEach(card => {
    const open = () => {
      const platform = card.dataset.platform;
      const index = parseInt(card.dataset.index, 10);
      openEditModal(platform, index);
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });
}

function updateStats(shown) {
  let totalGames = 0;
  let totalUnits = 0;
  for (const items of Object.values(inventory)) {
    totalGames += items.length;
    totalUnits += items.reduce((s, i) => s + (i.cantidad || 0), 0);
  }
  if (shown != null && searchQuery) {
    statsEl.textContent = `${shown} resultados · ${totalUnits} unidades en total`;
  } else {
    statsEl.textContent = `${totalGames} juegos · ${totalUnits} unidades en stock`;
  }
}

// ========== Edit Modal ==========
function openEditModal(platform, index) {
  const items = inventory[platform] || [];
  const item = items[index];
  if (!item) return;

  document.getElementById('editPlatform').value = platform;
  document.getElementById('editIndex').value = index;
  document.getElementById('editNombre').value = item.nombre || '';
  document.getElementById('editCantidad').value = item.cantidad != null ? item.cantidad : 0;
  document.getElementById('editPrecio').value =
    item.precio_unitario != null && !isNaN(item.precio_unitario) ? item.precio_unitario : '';

  updateBobPreview();
  editModal.classList.remove('hidden');
  document.getElementById('editNombre').focus();
}

function closeEditModal() {
  editModal.classList.add('hidden');
}

function updateBobPreview() {
  const usd = parseFloat(document.getElementById('editPrecio').value);
  const el = document.getElementById('editBobPreview');
  if (usd == null || isNaN(usd)) {
    el.textContent = 'Bs —';
    return;
  }
  const bob = (usd * exchangeRate + ajusteBob).toFixed(0);
  el.textContent = `≈ Bs ${bob} (tasa ${exchangeRate}${ajusteBob ? ` + ${ajusteBob} Bs` : ''})`;
}

document.getElementById('editPrecio').addEventListener('input', updateBobPreview);

editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const platform = document.getElementById('editPlatform').value;
  const index = parseInt(document.getElementById('editIndex').value, 10);
  const items = inventory[platform];
  if (!items || !items[index]) return;

  const nombre = document.getElementById('editNombre').value.trim();
  const cantidad = parseInt(document.getElementById('editCantidad').value, 10);
  const precioRaw = document.getElementById('editPrecio').value;
  const precio = precioRaw === '' ? null : parseFloat(precioRaw);

  if (!nombre) {
    showToast('El nombre es obligatorio', 'error');
    return;
  }
  if (isNaN(cantidad) || cantidad < 0) {
    showToast('Unidades inválidas', 'error');
    return;
  }

  const item = items[index];
  item.nombre = nombre;
  item.cantidad = cantidad;
  item.precio_unitario = precio != null && !isNaN(precio) ? precio : null;
  item.precio_total = (item.precio_unitario != null ? item.precio_unitario : 0) * cantidad;

  saveInventory();
  closeEditModal();
  renderTabs();
  renderContent();
  showToast('Guardado', 'success');
});

document.getElementById('deleteBtn').addEventListener('click', () => {
  const platform = document.getElementById('editPlatform').value;
  const index = parseInt(document.getElementById('editIndex').value, 10);
  const items = inventory[platform];
  if (!items || !items[index]) return;

  const name = items[index].nombre || 'este producto';
  if (!confirm(`¿Eliminar "${name}"?`)) return;

  items.splice(index, 1);
  saveInventory();
  closeEditModal();
  renderTabs();
  renderContent();
  showToast('Eliminado', 'success');
});

document.getElementById('closeModal').addEventListener('click', closeEditModal);
document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
document.getElementById('modalBackdrop').addEventListener('click', closeEditModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
    closeEditModal();
  }
});

// ========== Excel Export ==========
function exportExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Librería Excel no cargada. Revisa la conexión.', 'error');
    return;
  }

  const rows = [];
  for (const platform of PLATFORM_ORDER) {
    const items = inventory[platform] || [];
    for (const item of items) {
      const usd = item.precio_unitario;
      const bob = usd != null && !isNaN(usd)
        ? Math.round(usd * exchangeRate + ajusteBob)
        : '';
      rows.push({
        Plataforma: PLATFORM_LABELS[platform] || platform,
        Plataforma_Key: platform,
        Nombre: item.nombre || '',
        Unidades: item.cantidad != null ? item.cantidad : 0,
        Precio_USD: usd != null && !isNaN(usd) ? usd : '',
        Precio_BOB: bob,
        Precio_Total_USD: item.precio_total != null ? item.precio_total : ''
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  // Column widths
  ws['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 40 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  // Also one sheet per platform for convenience
  for (const platform of PLATFORM_ORDER) {
    const items = inventory[platform] || [];
    if (items.length === 0) continue;
    const sheetRows = items.map(item => {
      const usd = item.precio_unitario;
      const bob = usd != null && !isNaN(usd)
        ? Math.round(usd * exchangeRate + ajusteBob)
        : '';
      return {
        Nombre: item.nombre || '',
        Unidades: item.cantidad != null ? item.cantidad : 0,
        Precio_USD: usd != null && !isNaN(usd) ? usd : '',
        Precio_BOB: bob
      };
    });
    const s = XLSX.utils.json_to_sheet(sheetRows);
    s['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    const safeName = (PLATFORM_LABELS[platform] || platform).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, s, safeName);
  }

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `inventario_${date}.xlsx`);
  showToast('Excel exportado', 'success');
}

// ========== Excel Import (merge: update + add new) ==========
function normalizePlatform(val) {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  // Direct key
  if (PLATFORM_ORDER.includes(s)) return s;
  // Labels
  const labelMap = {
    'PS5': 'PS5',
    'PS4': 'PS4',
    'SWITCH 2': 'NINTENDO 2',
    'NINTENDO 2': 'NINTENDO 2',
    'SWITCH': 'NINTENDO',
    'NINTENDO': 'NINTENDO',
    'XBOX': 'XBOX',
    'CONSOLAS': 'CONSOLAS',
    'ACCESORIOS': 'ACCESORIOS'
  };
  if (labelMap[s]) return labelMap[s];
  // Partial
  if (s.includes('SWITCH') && s.includes('2')) return 'NINTENDO 2';
  if (s.includes('SWITCH') || s.includes('NINTENDO')) return 'NINTENDO';
  if (s.includes('PS5')) return 'PS5';
  if (s.includes('PS4')) return 'PS4';
  if (s.includes('XBOX')) return 'XBOX';
  if (s.includes('CONSOLA')) return 'CONSOLAS';
  if (s.includes('ACCESOR')) return 'ACCESORIOS';
  return null;
}

function importExcel(file) {
  if (typeof XLSX === 'undefined') {
    showToast('Librería Excel no cargada. Revisa la conexión.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });

      // Prefer sheet "Inventario" if present, else first sheet
      let sheetName = wb.SheetNames.find(n => n.toLowerCase() === 'inventario') || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) {
        showToast('El Excel está vacío', 'error');
        return;
      }

      // Detect columns (flexible names)
      const colMap = (keys, candidates) => {
        const lower = keys.map(k => String(k).toLowerCase());
        for (const c of candidates) {
          const i = lower.indexOf(c.toLowerCase());
          if (i >= 0) return keys[i];
        }
        return null;
      };

      const keys = Object.keys(rows[0]);
      const colPlataforma = colMap(keys, ['Plataforma_Key', 'Plataforma', 'Platform', 'plataforma']);
      const colNombre = colMap(keys, ['Nombre', 'Name', 'Juego', 'Producto', 'nombre']);
      const colUnidades = colMap(keys, ['Unidades', 'Cantidad', 'Stock', 'Qty', 'cantidad', 'unidades']);
      const colPrecio = colMap(keys, ['Precio_USD', 'Precio', 'Precio USD', 'precio_unitario', 'USD', 'precio']);

      if (!colNombre) {
        showToast('No se encontró columna Nombre', 'error');
        return;
      }

      let updated = 0;
      let added = 0;

      for (const row of rows) {
        const nombre = String(row[colNombre] || '').trim();
        if (!nombre) continue;

        let platform = colPlataforma ? normalizePlatform(row[colPlataforma]) : null;
        // If no platform column or invalid, try current platform or default PS5
        if (!platform) {
          platform = currentPlatform !== 'ALL' ? currentPlatform : 'PS5';
        }
        if (!inventory[platform]) inventory[platform] = [];

        const cantidadRaw = colUnidades != null ? row[colUnidades] : 0;
        const cantidad = parseInt(cantidadRaw, 10);
        const cantidadFinal = isNaN(cantidad) ? 0 : Math.max(0, cantidad);

        let precio = null;
        if (colPrecio != null && row[colPrecio] !== '' && row[colPrecio] != null) {
          const p = parseFloat(row[colPrecio]);
          if (!isNaN(p)) precio = p;
        }

        // Match by name (case-insensitive) within platform
        const list = inventory[platform];
        const idx = list.findIndex(
          it => (it.nombre || '').toLowerCase() === nombre.toLowerCase()
        );

        if (idx >= 0) {
          // Update existing
          list[idx].nombre = nombre;
          list[idx].cantidad = cantidadFinal;
          if (precio !== null) list[idx].precio_unitario = precio;
          list[idx].precio_total =
            (list[idx].precio_unitario != null ? list[idx].precio_unitario : 0) * cantidadFinal;
          updated++;
        } else {
          // Add new
          list.push({
            nombre,
            cantidad: cantidadFinal,
            precio_unitario: precio,
            precio_total: (precio != null ? precio : 0) * cantidadFinal
          });
          added++;
        }
      }

      saveInventory();
      renderTabs();
      renderContent();
      showToast(`Importado: ${updated} actualizados, ${added} nuevos`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al leer el Excel', 'error');
    }
  };
  reader.onerror = () => showToast('No se pudo leer el archivo', 'error');
  reader.readAsArrayBuffer(file);
}

// ========== Events ==========
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  clearSearchBtn.classList.toggle('hidden', !searchQuery);
  renderContent();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  renderContent();
  searchInput.focus();
});

rateInput.addEventListener('change', () => {
  exchangeRate = parseFloat(rateInput.value) || 6.96;
  localStorage.setItem('usd_bob_rate', exchangeRate);
  renderContent();
  if (!editModal.classList.contains('hidden')) updateBobPreview();
});

rateInput.addEventListener('input', () => {
  exchangeRate = parseFloat(rateInput.value) || 6.96;
  localStorage.setItem('usd_bob_rate', exchangeRate);
  renderContent();
  if (!editModal.classList.contains('hidden')) updateBobPreview();
});

ajusteBobInput.addEventListener('input', () => {
  ajusteBob = parseFloat(ajusteBobInput.value) || 0;
  localStorage.setItem('ajuste_bob', ajusteBob);
  renderContent();
  if (!editModal.classList.contains('hidden')) updateBobPreview();
});

ajusteBobInput.addEventListener('change', () => {
  ajusteBob = parseFloat(ajusteBobInput.value) || 0;
  localStorage.setItem('ajuste_bob', ajusteBob);
  renderContent();
});

exportBtn.addEventListener('click', exportExcel);

importInput.addEventListener('change', () => {
  const file = importInput.files && importInput.files[0];
  if (file) {
    importExcel(file);
    importInput.value = '';
  }
});

// ========== PWA Install ==========
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    installBtn.classList.add('hidden');
  }
  deferredPrompt = null;
});

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW failed', err));
  });
}

// Init
loadInventory();
