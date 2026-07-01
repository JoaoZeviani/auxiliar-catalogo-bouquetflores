import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseConfig, ADMIN_EMAIL } from './supabase-config.js';

const STORAGE_BUCKET = 'catalogo-imagens';
const STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // referência visual usada pela barra do painel

const DEFAULT_SETTINGS = {
  businessName: 'Sua Floricultura',
  catalogTitle: 'Catálogo de Flores',
  catalogSubtitle: 'Flores, presentes e carinho em cada detalhe',
  businessPhone: '',
  businessAddress: '',
  deliveryFee: '25,00',
  titleFont: 'freestyle',
  bodyFont: 'arial',
  priceFont: 'georgia',
  primaryColor: '#5f7f5a',
  secondaryColor: '#d69a8b',
  backgroundColor: '#f7f2ea',
  accentColor: '#c58f42',
  pdfPageColor: '#ffffff',
  pdfCardColor: '#ffffff',
  pdfCardBorderColor: '#eadfd4',
  pdfTextColor: '#263026',
  pdfMutedTextColor: '#666d64',
  pdfPriceColor: '#c58f42',
  promoBackgroundColor: '#5f7f5a',
  promoTextColor: '#ffffff',
  promoFooter: 'Adicione chocolate ou pelúcia\npara deixar seu pedido ainda mais especial',
  catalogBackgroundMode: 'preset_1',
  hideUnavailablePdf: true,
  showPromoFooter: true
};

const DEFAULT_ASSETS = {
  logoUrl: '', logoPath: '',
  coverUrl: '', coverPath: '',
  iconUrl: '', iconPath: '',
  whatsappIconUrl: '', whatsappIconPath: '',
  deliveryIconUrl: '', deliveryIconPath: '',
  locationIconUrl: '', locationIconPath: '',
  promoImageUrl: '', promoImagePath: '',
  catalogBackgroundUrl: '',
  catalogBackgroundPath: '',
  importedFixedImages: {}
};

const CATALOG_BACKGROUND_PRESETS = {
  preset_1: './assets/fundos-catalogo/fundo_catalogo_01.jpg',
  preset_2: './assets/fundos-catalogo/fundo_catalogo_02.jpg',
  preset_3: './assets/fundos-catalogo/fundo_catalogo_03.jpg',
  preset_4: './assets/fundos-catalogo/fundo_catalogo_04.jpg',
  preset_5: './assets/fundos-catalogo/fundo_catalogo_05.jpg',
  preset_6: './assets/fundos-catalogo/fundo_catalogo_06.jpg',
  preset_7: './assets/fundos-catalogo/fundo_catalogo_07.jpg'
};

const CATALOG_BACKGROUND_PALETTES = {
  preset_1: {
    primaryColor: '#5f7253', secondaryColor: '#c7ad90', backgroundColor: '#f6f0e7', accentColor: '#b98b50',
    pdfPageColor: '#f6f0e7', pdfCardColor: '#fffaf2', pdfCardBorderColor: '#d8c7ad',
    pdfTextColor: '#273323', pdfMutedTextColor: '#6f7467', pdfPriceColor: '#9d6d32',
    promoBackgroundColor: '#5f7253', promoTextColor: '#ffffff'
  },
  preset_2: {
    primaryColor: '#60766a', secondaryColor: '#b8c5b4', backgroundColor: '#f3f1ea', accentColor: '#a98756',
    pdfPageColor: '#f3f1ea', pdfCardColor: '#fffdf6', pdfCardBorderColor: '#c9d2c5',
    pdfTextColor: '#25322b', pdfMutedTextColor: '#687269', pdfPriceColor: '#8a6a3c',
    promoBackgroundColor: '#60766a', promoTextColor: '#ffffff'
  },
  preset_3: {
    primaryColor: '#74614f', secondaryColor: '#d9a6a0', backgroundColor: '#faf1ed', accentColor: '#b87570',
    pdfPageColor: '#faf1ed', pdfCardColor: '#fff9f6', pdfCardBorderColor: '#e2c3bb',
    pdfTextColor: '#352b25', pdfMutedTextColor: '#7a6c63', pdfPriceColor: '#a65f5b',
    promoBackgroundColor: '#74614f', promoTextColor: '#ffffff'
  },
  preset_4: {
    primaryColor: '#597061', secondaryColor: '#c4d0bd', backgroundColor: '#eff4ed', accentColor: '#87945d',
    pdfPageColor: '#eff4ed', pdfCardColor: '#fbfff8', pdfCardBorderColor: '#c8d6c3',
    pdfTextColor: '#223329', pdfMutedTextColor: '#637166', pdfPriceColor: '#6f7f43',
    promoBackgroundColor: '#597061', promoTextColor: '#ffffff'
  },
  preset_5: {
    primaryColor: '#546875', secondaryColor: '#b7c2c8', backgroundColor: '#eef2f2', accentColor: '#8b8b60',
    pdfPageColor: '#eef2f2', pdfCardColor: '#fbfdfc', pdfCardBorderColor: '#c6d0d4',
    pdfTextColor: '#233039', pdfMutedTextColor: '#657078', pdfPriceColor: '#747344',
    promoBackgroundColor: '#546875', promoTextColor: '#ffffff'
  },
  preset_6: {
    primaryColor: '#70433d', secondaryColor: '#d3b2a3', backgroundColor: '#f5ebe3', accentColor: '#9b5f57',
    pdfPageColor: '#f5ebe3', pdfCardColor: '#fff8f1', pdfCardBorderColor: '#dec5b8',
    pdfTextColor: '#392a27', pdfMutedTextColor: '#776964', pdfPriceColor: '#84413d',
    promoBackgroundColor: '#70433d', promoTextColor: '#ffffff'
  },
  preset_7: {
    primaryColor: '#7a4644', secondaryColor: '#d8b9aa', backgroundColor: '#f7ede5', accentColor: '#a8695f',
    pdfPageColor: '#f7ede5', pdfCardColor: '#fff9f3', pdfCardBorderColor: '#e2c8ba',
    pdfTextColor: '#3a2a28', pdfMutedTextColor: '#7c6a64', pdfPriceColor: '#8e4642',
    promoBackgroundColor: '#7a4644', promoTextColor: '#ffffff'
  }
};

function normalizeCatalogBackgroundMode(mode) {
  return CATALOG_BACKGROUND_PRESETS[mode] ? mode : 'preset_1';
}
function paletteForCatalogMode(mode) {
  const safeMode = normalizeCatalogBackgroundMode(mode || DEFAULT_SETTINGS.catalogBackgroundMode);
  return CATALOG_BACKGROUND_PALETTES[safeMode] || CATALOG_BACKGROUND_PALETTES.preset_1;
}
function activeCatalogPalette() {
  const mode = normalizeCatalogBackgroundMode((state && state.settings && state.settings.catalogBackgroundMode) || DEFAULT_SETTINGS.catalogBackgroundMode);
  return paletteForCatalogMode(mode);
}
function applyCatalogPaletteToSettings(settings) {
  const safeSettings = settings || {};
  const mode = normalizeCatalogBackgroundMode(safeSettings.catalogBackgroundMode || DEFAULT_SETTINGS.catalogBackgroundMode);
  const palette = paletteForCatalogMode(mode);
  return { ...safeSettings, catalogBackgroundMode: mode, ...palette };
}
function selectedCatalogBackgroundUrl() {
  const mode = normalizeCatalogBackgroundMode(state?.settings?.catalogBackgroundMode || DEFAULT_SETTINGS.catalogBackgroundMode);
  return CATALOG_BACKGROUND_PRESETS[mode] || CATALOG_BACKGROUND_PRESETS.preset_1;
}

function catalogBackgroundLabel(mode) {
  const labels = {
    preset_1: 'Fundo 01 - folhas claras',
    preset_2: 'Fundo 02 - eucalipto',
    preset_3: 'Fundo 03 - floral rosado',
    preset_4: 'Fundo 04 - verde suave',
    preset_5: 'Fundo 05 - azul acinzentado',
    preset_6: 'Fundo 06 - vinho suave e bege',
    preset_7: 'Fundo 07 - floral vinho e bege'
  };
  return labels[normalizeCatalogBackgroundMode(mode)] || labels.preset_1;
}

function renderCatalogBackgroundPreview() {
  const preview = $('catalogBackgroundVisualPreview');
  const label = $('catalogBackgroundVisualLabel');
  if (!preview && !label) return;

  const mode = normalizeCatalogBackgroundMode(state?.settings?.catalogBackgroundMode || DEFAULT_SETTINGS.catalogBackgroundMode);
  const url = CATALOG_BACKGROUND_PRESETS[mode] || CATALOG_BACKGROUND_PRESETS.preset_1;

  if (preview) {
    preview.style.backgroundImage = `url("${url}")`;
    preview.style.backgroundPosition = 'center bottom';
    preview.textContent = '';
  }
  if (label) label.textContent = catalogBackgroundLabel(mode);
}

const state = {
  products: [],
  categories: [],
  settings: { ...DEFAULT_SETTINGS },
  assets: { ...DEFAULT_ASSETS },
  editingProduct: null,
  storageEstimate: { usedBytes: 0, status: 'idle' },
  supabaseReady: false
};

const $ = (id) => document.getElementById(id);

const pageData = {
  dashboard: ['Início', 'Resumo dos produtos e opções do catálogo.'],
  produtos: ['Produtos', 'Cadastre, altere, exclua e controle a disponibilidade.'],
  categorias: ['Categorias', 'Organize a ordem das categorias no PDF.'],
  imagens: ['Imagens fixas', 'Cadastre logotipo, foto da capa, ícones e imagem promocional.'],
  aparencia: ['Aparência do PDF', 'Escolha informações da capa, fundo, fontes e rodapé promocional.']
};

function toast(message, type = 'ok') {
  const el = $('toast');
  el.textContent = message;
  el.style.background = type === 'error' ? '#8f2f2f' : '#263026';
  el.classList.add('show');
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => el.classList.remove('show'), 3600);
}

function isConfigMissing() {
  return !supabaseConfig?.url || !supabaseConfig?.anonKey ||
    supabaseConfig.url.includes('COLE_AQUI') ||
    supabaseConfig.anonKey.includes('COLE_AQUI');
}

let supabase;

try {
  if (isConfigMissing()) {
    throw new Error('Supabase ainda não configurado. Edite supabase-config.js com a URL e a chave anon/public do seu projeto.');
  }
  supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  state.supabaseReady = true;
} catch (error) {
  console.error(error);
  $('loginScreen').querySelector('.login-card').insertAdjacentHTML(
    'beforeend',
    `<div class="config-error"><strong>Configuração pendente:</strong><br>${escapeHtml(error.message)}</div>`
  );
}

function nowIso() {
  return new Date().toISOString();
}

function mapCategory(row) {
  return {
    id: row.id,
    nome: row.nome,
    ordem: row.ordem,
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

function mapProduct(row) {
  return {
    id: row.id,
    nome: row.nome,
    preco: Number(row.preco || 0),
    descricao: row.descricao || '',
    categoriaId: row.categoria_id,
    disponivel: row.disponivel ?? true,
    imagemUrl: row.imagem_url || '',
    imagemPath: row.imagem_path || '',
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function sanitizeFileName(name = 'imagem') {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
}

function setThemeVariables() {
  const palette = activeCatalogPalette();
  document.documentElement.style.setProperty('--primary', palette.primaryColor);
  document.documentElement.style.setProperty('--secondary', palette.secondaryColor);
  document.documentElement.style.setProperty('--background', palette.backgroundColor);
  document.documentElement.style.setProperty('--accent', palette.accentColor);
}
function bindNavigation() {
  document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => openTab(btn.dataset.tab));
  });
  document.querySelectorAll('[data-jump]').forEach((btn) => {
    btn.addEventListener('click', () => openTab(btn.dataset.jump));
  });
}

function openTab(tab) {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `tab-${tab}`));
  const [title, subtitle] = pageData[tab] || pageData.dashboard;
  $('pageTitle').textContent = title;
  $('pageSubtitle').textContent = subtitle;
}

function showApp(show) {
  $('loginScreen').classList.toggle('hidden', show);
  $('appShell').classList.toggle('hidden', !show);
}

function bindAuth() {
  $('togglePassword').addEventListener('click', () => {
    const input = $('passwordInput');
    input.type = input.type === 'password' ? 'text' : 'password';
    $('togglePassword').textContent = input.type === 'password' ? 'Mostrar' : 'Ocultar';
  });

  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.supabaseReady) {
      toast('Configure o Supabase antes de entrar.', 'error');
      return;
    }
    const password = $('passwordInput').value.trim();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password
      });
      if (error) throw error;
      $('passwordInput').value = '';
    } catch (error) {
      console.error(error);
      toast('Senha incorreta ou usuário do Supabase não criado.', 'error');
    }
  });

  $('logoutBtn').addEventListener('click', () => supabase.auth.signOut());

  if (state.supabaseReady) {
    supabase.auth.getSession().then(({ data }) => {
      const hasSession = !!data.session?.user;
      showApp(hasSession);
      if (hasSession) startRealtimeListeners();
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = !!session?.user;
      showApp(hasSession);
      if (hasSession) startRealtimeListeners();
    });
  }
}

async function startRealtimeListeners() {
  await loadAllData();

  if (startRealtimeListeners.started) return;
  startRealtimeListeners.started = true;

  // Atualiza a tela automaticamente quando outro dispositivo altera dados.
  supabase.channel('catalogo-dados')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias' }, async () => {
      await loadCategories();
      renderCategories();
      renderProductCategoryOptions();
      renderProducts();
      renderStats();
      refreshStorageEstimate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, async () => {
      await loadProducts();
      renderProducts();
      renderCategories();
      renderStats();
      refreshStorageEstimate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, async () => {
      await loadSettings();
      await loadAssets();
      setThemeVariables();
      fillSettingsForm();
      renderAssetPreviews();
      refreshStorageEstimate();
    })
    .subscribe();
}

async function loadAllData() {
  await Promise.all([loadCategories(), loadProducts(), loadSettings(), loadAssets()]);
  renderCategories();
  renderProductCategoryOptions();
  renderProducts();
  renderStats();
  setThemeVariables();
  fillSettingsForm();
  renderAssetPreviews();
  refreshStorageEstimate();
}

async function loadCategories() {
  const { data, error } = await supabase.from('categorias').select('*').order('ordem', { ascending: true });
  if (error) throw error;
  state.categories = (data || []).map(mapCategory);
}

async function loadProducts() {
  const { data, error } = await supabase.from('produtos').select('*').order('criado_em', { ascending: false });
  if (error) throw error;
  state.products = (data || []).map(mapProduct);
}

async function loadSettings() {
  const { data, error } = await supabase.from('configuracoes').select('dados').eq('id', 'visual').maybeSingle();
  if (error) throw error;
  if (!data) {
    await supabase.from('configuracoes').upsert({ id: 'visual', dados: DEFAULT_SETTINGS, atualizado_em: nowIso() });
    state.settings = applyCatalogPaletteToSettings({ ...DEFAULT_SETTINGS });
    return;
  }
  state.settings = applyCatalogPaletteToSettings({ ...DEFAULT_SETTINGS, ...(data.dados || {}) });
}

function normalizeAssets(raw = {}) {
  const assets = { ...DEFAULT_ASSETS, ...(raw || {}) };
  const imported = assets.importedFixedImages || {};
  const importedPromo = imported['Imagem Chocolates e Pelúcias'];
  const importedWhatsapp = imported['Ícone WhatsApp'];
  const importedDelivery = imported['Ícone Entrega'];
  const importedLocation = imported['Ícone Endereço'];

  if (!assets.promoImageUrl && importedPromo?.url) assets.promoImageUrl = importedPromo.url;
  if (!assets.promoImagePath && importedPromo?.path) assets.promoImagePath = importedPromo.path;
  if (!assets.whatsappIconUrl && importedWhatsapp?.url) assets.whatsappIconUrl = importedWhatsapp.url;
  if (!assets.whatsappIconPath && importedWhatsapp?.path) assets.whatsappIconPath = importedWhatsapp.path;
  if (!assets.deliveryIconUrl && importedDelivery?.url) assets.deliveryIconUrl = importedDelivery.url;
  if (!assets.deliveryIconPath && importedDelivery?.path) assets.deliveryIconPath = importedDelivery.path;
  if (!assets.locationIconUrl && importedLocation?.url) assets.locationIconUrl = importedLocation.url;
  if (!assets.locationIconPath && importedLocation?.path) assets.locationIconPath = importedLocation.path;

  return assets;
}

async function loadAssets() {
  const { data, error } = await supabase.from('configuracoes').select('dados').eq('id', 'assets').maybeSingle();
  if (error) throw error;
  if (!data) {
    await supabase.from('configuracoes').upsert({ id: 'assets', dados: DEFAULT_ASSETS, atualizado_em: nowIso() });
    state.assets = { ...DEFAULT_ASSETS };
    return;
  }
  state.assets = normalizeAssets(data.dados || {});
}

function bindProductUi() {
  $('newProductBtn').addEventListener('click', () => openProductDialog());
  $('closeProductDialog').addEventListener('click', () => $('productDialog').close());
  $('cancelProductBtn').addEventListener('click', () => $('productDialog').close());
  $('productSearch').addEventListener('input', renderProducts);
  $('productSort').addEventListener('change', renderProducts);
  $('productImage').addEventListener('change', previewProductFile);

  $('productForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveProduct();
  });
}

function openProductDialog(product = null) {
  state.editingProduct = product;
  $('productDialogTitle').textContent = product ? 'Alterar produto' : 'Novo produto';
  $('productId').value = product?.id || '';
  $('productName').value = product?.nome || '';
  $('productPrice').value = product?.preco ?? '';
  $('productDescription').value = product?.descricao || '';
  $('productCategory').value = product?.categoriaId || state.categories[0]?.id || '';
  $('productAvailable').checked = product?.disponivel ?? true;
  $('productImage').value = '';
  renderProductImagePreview(product?.imagemUrl || '');
  $('productDialog').showModal();
}

function renderProductCategoryOptions() {
  const select = $('productCategory');
  select.innerHTML = '';
  if (!state.categories.length) {
    select.innerHTML = '<option value="">Cadastre uma categoria primeiro</option>';
    return;
  }
  state.categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.nome;
    select.appendChild(option);
  });
}

function previewProductFile() {
  const file = $('productImage').files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  renderProductImagePreview(url);
}

function renderProductImagePreview(url) {
  const box = $('productImagePreview');
  box.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="Prévia do produto">` : 'Nenhuma imagem selecionada';
}

async function uploadImage(file, folder) {
  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

async function deleteStoragePath(path) {
  if (!path) return;
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    if (error) console.warn('Imagem não removida:', error);
  } catch (error) {
    console.warn('Imagem não removida:', error);
  }
}

async function saveProduct() {
  if (!state.categories.length) {
    toast('Cadastre pelo menos uma categoria antes do produto.', 'error');
    return;
  }

  const id = $('productId').value;
  const file = $('productImage').files[0];
  const old = state.editingProduct;
  const payload = {
    nome: $('productName').value.trim(),
    preco: Number($('productPrice').value || 0),
    descricao: $('productDescription').value.trim(),
    categoria_id: $('productCategory').value,
    disponivel: $('productAvailable').checked,
    atualizado_em: nowIso()
  };

  if (!payload.nome || !payload.categoria_id) {
    toast('Preencha nome e categoria.', 'error');
    return;
  }

  try {
    if (file) {
      const uploaded = await uploadImage(file, 'produtos');
      payload.imagem_url = uploaded.url;
      payload.imagem_path = uploaded.path;
    }

    if (id) {
      const { error } = await supabase.from('produtos').update(payload).eq('id', id);
      if (error) throw error;
      if (file && old?.imagemPath) await deleteStoragePath(old.imagemPath);
      toast('Produto atualizado.');
    } else {
      payload.criado_em = nowIso();
      const { error } = await supabase.from('produtos').insert(payload);
      if (error) throw error;
      toast('Produto cadastrado.');
    }

    await loadProducts();
    renderProducts();
    renderCategories();
    renderStats();
    refreshStorageEstimate();
    $('productDialog').close();
  } catch (error) {
    console.error(error);
    toast('Erro ao salvar produto.', 'error');
  }
}

function categoryName(categoryId) {
  return state.categories.find((c) => c.id === categoryId)?.nome || 'Sem categoria';
}

function productCountByCategory(categoryId) {
  return state.products.filter((product) => product.categoriaId === categoryId).length;
}

function pluralProduct(count) {
  return count === 1 ? '1 produto' : `${count} produtos`;
}

function sortedProductsForApp(products) {
  const sort = $('productSort')?.value || 'nome';
  const categoryOrder = new Map(state.categories.map((category, index) => [category.id, index]));
  const byName = (a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');

  return [...products].sort((a, b) => {
    if (sort === 'categoria') {
      const orderA = categoryOrder.has(a.categoriaId) ? categoryOrder.get(a.categoriaId) : 9999;
      const orderB = categoryOrder.has(b.categoriaId) ? categoryOrder.get(b.categoriaId) : 9999;
      return orderA - orderB || byName(a, b);
    }

    if (sort === 'preco') {
      return Number(a.preco || 0) - Number(b.preco || 0) || byName(a, b);
    }

    if (sort === 'disponibilidade') {
      return Number(b.disponivel) - Number(a.disponivel) || byName(a, b);
    }

    return byName(a, b);
  });
}

function renderProducts() {
  const list = $('productsList');
  const search = $('productSearch')?.value?.trim()?.toLowerCase() || '';
  const products = sortedProductsForApp(state.products.filter((p) => {
    const haystack = `${p.nome || ''} ${p.descricao || ''} ${categoryName(p.categoriaId)}`.toLowerCase();
    return haystack.includes(search);
  }));

  if (!products.length) {
    list.innerHTML = '<div class="welcome-card">Nenhum produto encontrado.</div>';
    return;
  }

  list.innerHTML = products.map((p) => `
    <article class="product-card">
      <div class="product-card-img">${p.imagemUrl ? `<img class="product-thumb" src="${escapeHtml(p.imagemUrl)}" alt="${escapeHtml(p.nome)}" loading="lazy" style="width:auto!important;height:auto!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center center!important;display:block!important;">` : '<span class="no-image">✿</span>'}</div>
      <div class="product-card-body">
        <div class="product-meta">
          <span class="badge">${escapeHtml(categoryName(p.categoriaId))}</span>
          <span class="badge ${p.disponivel ? '' : 'off'}">${p.disponivel ? 'Disponível' : 'Indisponível'}</span>
        </div>
        <h3>${escapeHtml(p.nome)}</h3>
        <div class="price">${formatCurrency(p.preco)}</div>
        <p class="product-description">${escapeHtml(p.descricao || 'Sem descrição.')}</p>
        <div class="card-actions">
          <button class="secondary-btn" data-action="edit" data-id="${p.id}">Alterar</button>
          <button class="ghost-btn" data-action="toggle" data-id="${p.id}">${p.disponivel ? 'Tornar indisponível' : 'Tornar disponível'}</button>
          <button class="danger-btn" data-action="delete" data-id="${p.id}">Excluir</button>
        </div>
      </div>
    </article>
  `).join('');

  list.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleProductAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handleProductAction(action, id) {
  const product = state.products.find((p) => p.id === id);
  if (!product) return;
  if (action === 'edit') openProductDialog(product);
  if (action === 'toggle') {
    const { error } = await supabase.from('produtos').update({ disponivel: !product.disponivel, atualizado_em: nowIso() }).eq('id', id);
    if (error) return toast('Erro ao alterar disponibilidade.', 'error');
    await loadProducts();
    renderProducts();
    renderCategories();
    renderStats();
    refreshStorageEstimate();
  }
  if (action === 'delete') {
    if (!confirm(`Excluir o produto "${product.nome}"?`)) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) return toast('Erro ao excluir produto.', 'error');
    await deleteStoragePath(product.imagemPath);
    await loadProducts();
    renderProducts();
    renderCategories();
    renderStats();
    refreshStorageEstimate();
    toast('Produto excluído.');
  }
}

function bindCategoryUi() {
  $('categoryForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const nome = $('categoryName').value.trim();
    if (!nome) return;
    const ordem = state.categories.length ? Math.max(...state.categories.map((c) => Number(c.ordem || 0))) + 1 : 1;
    const { error } = await supabase.from('categorias').insert({ nome, ordem, criado_em: nowIso() });
    if (error) return toast('Erro ao adicionar categoria.', 'error');
    await loadCategories();
    renderCategories();
    renderProductCategoryOptions();
    renderProducts();
    renderStats();
    $('categoryName').value = '';
    toast('Categoria adicionada.');
  });
}

function renderCategories() {
  const list = $('categoriesList');
  if (!state.categories.length) {
    list.innerHTML = '<div class="welcome-card">Nenhuma categoria cadastrada.</div>';
    return;
  }

  list.innerHTML = state.categories.map((c, index) => `
    <div class="category-row">
      <div class="category-main">
        <input class="category-name-input" value="${escapeHtml(c.nome)}" data-id="${c.id}" aria-label="Nome da categoria">
        <span class="category-count">${pluralProduct(productCountByCategory(c.id))}</span>
      </div>
      <div class="category-actions">
        <button class="ghost-btn" data-action="up" data-id="${c.id}" ${index === 0 ? 'disabled' : ''}>Subir</button>
        <button class="ghost-btn" data-action="down" data-id="${c.id}" ${index === state.categories.length - 1 ? 'disabled' : ''}>Descer</button>
        <button class="secondary-btn" data-action="save" data-id="${c.id}">Salvar nome</button>
        <button class="danger-btn" data-action="delete" data-id="${c.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleCategoryAction(btn.dataset.action, btn.dataset.id));
  });
}

async function handleCategoryAction(action, id) {
  const index = state.categories.findIndex((c) => c.id === id);
  const category = state.categories[index];
  if (!category) return;

  if (action === 'save') {
    const input = document.querySelector(`.category-name-input[data-id="${id}"]`);
    const nome = input.value.trim();
    if (!nome) return;
    const { error } = await supabase.from('categorias').update({ nome, atualizado_em: nowIso() }).eq('id', id);
    if (error) return toast('Erro ao atualizar categoria.', 'error');
    await loadCategories();
    renderCategories();
    renderProductCategoryOptions();
    renderProducts();
    toast('Categoria atualizada.');
  }

  if (action === 'delete') {
    const used = state.products.some((p) => p.categoriaId === id);
    if (used) {
      toast('Não exclua categorias que ainda têm produtos. Altere os produtos primeiro.', 'error');
      return;
    }
    if (!confirm(`Excluir a categoria "${category.nome}"?`)) return;
    const { error } = await supabase.from('categorias').delete().eq('id', id);
    if (error) return toast('Erro ao excluir categoria.', 'error');
    await loadCategories();
    renderCategories();
    renderProductCategoryOptions();
    renderStats();
    toast('Categoria excluída.');
  }

  if (action === 'up' || action === 'down') {
    const otherIndex = action === 'up' ? index - 1 : index + 1;
    const other = state.categories[otherIndex];
    if (!other) return;

    const [one, two] = await Promise.all([
      supabase.from('categorias').update({ ordem: other.ordem, atualizado_em: nowIso() }).eq('id', category.id),
      supabase.from('categorias').update({ ordem: category.ordem, atualizado_em: nowIso() }).eq('id', other.id)
    ]);
    if (one.error || two.error) return toast('Erro ao reordenar categorias.', 'error');
    await loadCategories();
    renderCategories();
    renderProductCategoryOptions();
    renderProducts();
  }
}

function bindAssetsUi() {
  const map = [
    ['logoInput', 'logoUrl', 'logoPath', 'logotipo'],
    ['coverInput', 'coverUrl', 'coverPath', 'capa'],
    ['iconInput', 'iconUrl', 'iconPath', 'icone'],
    ['whatsappIconInput', 'whatsappIconUrl', 'whatsappIconPath', 'icone-whatsapp'],
    ['deliveryIconInput', 'deliveryIconUrl', 'deliveryIconPath', 'icone-entrega'],
    ['locationIconInput', 'locationIconUrl', 'locationIconPath', 'icone-local'],
    ['promoImageInput', 'promoImageUrl', 'promoImagePath', 'rodape-promocional']
  ];
  map.forEach(([inputId, urlKey, pathKey, folder]) => {
    const input = $(inputId);
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const uploaded = await uploadImage(file, 'assets/' + folder);
        const previousPath = state.assets[pathKey];
        const nextAssets = { ...state.assets, [urlKey]: uploaded.url, [pathKey]: uploaded.path };
        const { error } = await supabase.from('configuracoes').upsert({ id: 'assets', dados: nextAssets, atualizado_em: nowIso() });
        if (error) throw error;
        state.assets = nextAssets;
        await deleteStoragePath(previousPath);
        renderAssetPreviews();
        refreshStorageEstimate();
        input.value = '';
        toast('Imagem fixa atualizada.');
      } catch (error) {
        console.error(error);
        toast('Erro ao enviar imagem.', 'error');
      }
    });
  });
}
function renderAssetPreviews() {
  renderBranding();
  renderAssetPreview('logoPreview', state.assets.logoUrl, 'Nenhum logotipo');
  renderAssetPreview('coverPreview', state.assets.coverUrl, 'Nenhuma foto de capa');
  renderAssetPreview('iconPreview', state.assets.iconUrl, 'Nenhum ícone decorativo');
  renderAssetPreview('whatsappIconPreview', state.assets.whatsappIconUrl, 'Nenhum ícone de WhatsApp');
  renderAssetPreview('deliveryIconPreview', state.assets.deliveryIconUrl, 'Nenhum ícone de entrega');
  renderAssetPreview('locationIconPreview', state.assets.locationIconUrl, 'Nenhum ícone de local');
  renderAssetPreview('promoImagePreview', state.assets.promoImageUrl, 'Nenhuma imagem de rodapé');
}
function renderBranding() {
  const logoUrl = state.assets.logoUrl || '';
  const targets = [
    { id: 'loginBrandMark', fallback: '✿' },
    { id: 'sidebarLogoMark', fallback: '✿' }
  ];

  targets.forEach(({ id, fallback }) => {
    const el = $(id);
    if (!el) return;
    if (logoUrl) {
      el.classList.add('has-logo');
      el.innerHTML = `<img src="${escapeHtml(logoUrl)}" alt="Logotipo da floricultura">`;
    } else {
      el.classList.remove('has-logo');
      el.textContent = fallback;
    }
  });
}

function renderAssetPreview(id, url, emptyText) {
  const target = $(id);
  if (!target) return;
  target.innerHTML = url ? '<img src="' + escapeHtml(url) + '" alt="" />' : emptyText;
}
function settingInputValue(id, fallback) {
  const el = $(id);
  if (!el) return fallback;
  if (el.type === 'checkbox') return !!el.checked;
  return String(el.value ?? fallback ?? '').trim();
}
function setExistingInputValue(id, value) {
  const el = $(id);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = !!value;
  else el.value = value ?? '';
}
function collectSettingsPayload() {
  const catalogBackgroundMode = normalizeCatalogBackgroundMode(settingInputValue('catalogBackgroundMode', DEFAULT_SETTINGS.catalogBackgroundMode));
  const palette = paletteForCatalogMode(catalogBackgroundMode);
  return {
    businessName: settingInputValue('businessName', DEFAULT_SETTINGS.businessName),
    catalogTitle: settingInputValue('catalogTitle', DEFAULT_SETTINGS.catalogTitle),
    catalogSubtitle: settingInputValue('catalogSubtitle', DEFAULT_SETTINGS.catalogSubtitle),
    businessPhone: settingInputValue('businessPhone', DEFAULT_SETTINGS.businessPhone),
    businessAddress: settingInputValue('businessAddress', DEFAULT_SETTINGS.businessAddress),
    deliveryFee: settingInputValue('deliveryFee', DEFAULT_SETTINGS.deliveryFee),
    titleFont: settingInputValue('titleFont', DEFAULT_SETTINGS.titleFont),
    bodyFont: settingInputValue('bodyFont', DEFAULT_SETTINGS.bodyFont),
    priceFont: settingInputValue('priceFont', DEFAULT_SETTINGS.priceFont),
    ...palette,
    catalogBackgroundMode,
    promoFooter: settingInputValue('promoFooter', DEFAULT_SETTINGS.promoFooter),
    hideUnavailablePdf: settingInputValue('hideUnavailablePdf', DEFAULT_SETTINGS.hideUnavailablePdf),
    showPromoFooter: settingInputValue('showPromoFooter', DEFAULT_SETTINGS.showPromoFooter)
  };
}
let settingsAutoSaveTimer = null;
async function saveSettingsAutomatically() {
  if (!state.supabaseReady) return;
  const payload = collectSettingsPayload();
  state.settings = { ...DEFAULT_SETTINGS, ...payload };
  setThemeVariables();
  updateFontSamples();

  const { error } = await supabase.from('configuracoes').upsert({
    id: 'visual',
    dados: payload,
    atualizado_em: nowIso()
  });

  if (error) {
    console.error(error);
    toast('Erro ao salvar aparência automaticamente.', 'error');
  }
}

function scheduleSettingsAutoSave() {
  const payload = collectSettingsPayload();
  state.settings = { ...DEFAULT_SETTINGS, ...payload };
  setThemeVariables();
  updateFontSamples();
  window.clearTimeout(settingsAutoSaveTimer);
  settingsAutoSaveTimer = window.setTimeout(saveSettingsAutomatically, 500);
}

function bindSettingsUi() {
  const fields = [
    'businessName', 'catalogTitle', 'catalogSubtitle', 'businessPhone', 'businessAddress', 'deliveryFee',
    'titleFont', 'bodyFont', 'priceFont', 'catalogBackgroundMode', 'promoFooter',
    'hideUnavailablePdf', 'showPromoFooter'
  ];
  fields.forEach((id) => {
    const el = $(id);
    if (!el) return;
    const eventName = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(eventName, () => {
      if (id === 'titleFont' || id === 'bodyFont' || id === 'priceFont') updateFontSamples();
      if (id === 'catalogBackgroundMode') {
        state.settings = applyCatalogPaletteToSettings({ ...state.settings, catalogBackgroundMode: normalizeCatalogBackgroundMode(el.value) });
        setThemeVariables();
        renderCatalogBackgroundPreview();
      }
      scheduleSettingsAutoSave();
    });
  });
  const form = $('settingsForm');
  if (form) form.addEventListener('submit', (event) => { event.preventDefault(); saveSettingsAutomatically(); });
  updateFontSamples();
}
function fillSettingsForm() {
  state.settings = applyCatalogPaletteToSettings({ ...DEFAULT_SETTINGS, ...state.settings });
  setExistingInputValue('businessName', state.settings.businessName || '');
  setExistingInputValue('catalogTitle', state.settings.catalogTitle || DEFAULT_SETTINGS.catalogTitle);
  setExistingInputValue('catalogSubtitle', state.settings.catalogSubtitle || '');
  setExistingInputValue('businessPhone', state.settings.businessPhone || '');
  setExistingInputValue('businessAddress', state.settings.businessAddress || '');
  setExistingInputValue('deliveryFee', state.settings.deliveryFee || DEFAULT_SETTINGS.deliveryFee);
  setExistingInputValue('titleFont', state.settings.titleFont || DEFAULT_SETTINGS.titleFont);
  setExistingInputValue('bodyFont', state.settings.bodyFont || DEFAULT_SETTINGS.bodyFont);
  setExistingInputValue('priceFont', state.settings.priceFont || DEFAULT_SETTINGS.priceFont);
  setExistingInputValue('catalogBackgroundMode', normalizeCatalogBackgroundMode(state.settings.catalogBackgroundMode));
  renderCatalogBackgroundPreview();
  setExistingInputValue('promoFooter', state.settings.promoFooter || DEFAULT_SETTINGS.promoFooter);
  setExistingInputValue('hideUnavailablePdf', !!state.settings.hideUnavailablePdf);
  setExistingInputValue('showPromoFooter', !!state.settings.showPromoFooter);
  updateFontSamples();
}
function renderStats() {
  $('statTotal').textContent = state.products.length;
  $('statAvailable').textContent = state.products.filter((p) => p.disponivel).length;
  $('statUnavailable').textContent = state.products.filter((p) => !p.disponivel).length;
  $('statCategories').textContent = state.categories.length;
}

function imageUrlsForStorageEstimate() {
  const urls = new Set();

  state.products.forEach((product) => {
    if (product.imagemUrl) urls.add(product.imagemUrl);
  });

  [
    state.assets.logoUrl,
    state.assets.coverUrl,
    state.assets.iconUrl,
    state.assets.whatsappIconUrl,
    state.assets.deliveryIconUrl,
    state.assets.locationIconUrl,
    state.assets.promoImageUrl
  ].forEach((url) => {
    if (url) urls.add(url);
  });

  return [...urls];
}

function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function remoteFileSize(url) {
  if (!url) return 0;

  const fetchWithTimeout = async (targetUrl, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(targetUrl, { ...options, signal: controller.signal });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  try {
    const head = await fetchWithTimeout(url, { method: 'HEAD', cache: 'no-store' }, 5000);
    const len = Number(head.headers.get('content-length') || 0);
    if (head.ok && len > 0) return len;
  } catch (_error) {
    // Alguns buckets não retornam HEAD/CORS. Nesses casos tentamos GET abaixo.
  }

  try {
    const response = await fetchWithTimeout(url, { cache: 'force-cache' }, 10000);
    if (!response.ok) return 0;
    const blob = await response.blob();
    return blob.size || 0;
  } catch (_error) {
    return 0;
  }
}

function renderStorageUsage({ loading = false } = {}) {
  const used = Number(state.storageEstimate.usedBytes || 0);
  const percent = Math.min(100, Math.max(0, (used / STORAGE_LIMIT_BYTES) * 100));
  const percentNumber = percent < 0.1 && used > 0 ? '<0,1' : percent.toFixed(percent >= 10 ? 1 : 2).replace('.', ',');
  const percentText = `${percentNumber}%`;
  const usedText = `${formatBytes(used)} usados de ${formatBytes(STORAGE_LIMIT_BYTES)}`;

  if ($('storageBar')) $('storageBar').style.width = `${Math.max(percent, used > 0 ? 0.7 : 0)}%`;
  if ($('storagePercent')) $('storagePercent').textContent = percentText;
  if ($('storageStatus')) $('storageStatus').textContent = usedText;
  if ($('storageBytes')) $('storageBytes').textContent = usedText;

  const note = loading
    ? 'Atualizando a estimativa das imagens cadastradas no Storage...'
    : state.storageEstimate.status === 'partial'
      ? 'Estimativa parcial: algumas imagens não retornaram tamanho.'
      : 'Estimativa feita pelas imagens cadastradas no Storage. Fundos fixos do app não entram nessa conta.';

  if ($('storageNote')) $('storageNote').textContent = note;
}

let storageEstimateRun = 0;
async function refreshStorageEstimate() {
  const run = ++storageEstimateRun;
  renderStorageUsage({ loading: true });

  const urls = imageUrlsForStorageEstimate();
  const textBytes = new Blob([JSON.stringify({
    products: state.products,
    categories: state.categories,
    settings: state.settings,
    assets: state.assets
  })]).size;

  const timedOut = Symbol('storage-timeout');
  const results = await Promise.race([
    Promise.allSettled(urls.map(remoteFileSize)),
    new Promise((resolve) => window.setTimeout(() => resolve(timedOut), 14000))
  ]);
  if (run !== storageEstimateRun) return;

  const safeResults = results === timedOut ? [] : results;
  const imageBytes = safeResults.reduce((sum, result) => sum + (result.status === 'fulfilled' ? Number(result.value || 0) : 0), 0);
  const failed = results === timedOut || safeResults.some((result) => result.status !== 'fulfilled');

  state.storageEstimate = {
    usedBytes: imageBytes + textBytes,
    status: failed ? 'partial' : 'ok'
  };
  renderStorageUsage();
}

function bindPdfUi() {
  const generate = () => generateCatalogPdf({ onlyAvailable: !!state.settings.hideUnavailablePdf });
  $('quickPdfBtn').addEventListener('click', generate);
  $('dashboardPdfBtn')?.addEventListener('click', generate);
}

function hexToRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function setFillHex(pdf, hex) { pdf.setFillColor(...hexToRgb(hex)); }
function setDrawHex(pdf, hex) { pdf.setDrawColor(...hexToRgb(hex)); }
function setTextHex(pdf, hex) { pdf.setTextColor(...hexToRgb(hex)); }

function mixHex(a, b, amount = 0.5) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  const mix = ar.map((value, index) => Math.round(value * (1 - amount) + br[index] * amount));
  return '#' + mix.map((value) => value.toString(16).padStart(2, '0')).join('');
}


const FONT_CSS_MAP = {
  freestyle: "'Freestyle Script', 'Brush Script MT', cursive",
  playfair: "'Playfair Display', Georgia, serif",
  georgia: "Georgia, serif",
  times: "'Times New Roman', Times, serif",
  arial: "Arial, sans-serif",
  helvetica: "Helvetica, Arial, sans-serif",
  verdana: "Verdana, sans-serif",
  courier: "'Courier New', Courier, monospace"
};

function updateFontSamples() {
  const pairs = [
    ['titleFont', 'titleFontSample'],
    ['bodyFont', 'bodyFontSample'],
    ['priceFont', 'priceFontSample']
  ];
  pairs.forEach(([selectId, sampleId]) => {
    const select = $(selectId);
    const sample = $(sampleId);
    if (!select || !sample) return;
    const family = FONT_CSS_MAP[select.value] || FONT_CSS_MAP.arial;
    sample.style.fontFamily = family;
    sample.dataset.font = select.value;
    select.style.fontFamily = family;
  });
}

const PDF_FONT_MAP = {
  freestyle: 'times',
  playfair: 'times',
  georgia: 'times',
  times: 'times',
  arial: 'helvetica',
  helvetica: 'helvetica',
  verdana: 'helvetica',
  courier: 'courier'
};

const PDF_FONT_SIZE_SCALE = {
  freestyle: 1.12,
  playfair: 1.02,
  georgia: 1.00,
  times: 1.02,
  arial: 1.00,
  helvetica: 1.00,
  verdana: 0.92,
  courier: 0.88
};

function pdfFontScale(kind = 'body') {
  const key = kind === 'title' ? 'titleFont' : kind === 'price' ? 'priceFont' : 'bodyFont';
  const selected = state.settings[key] || DEFAULT_SETTINGS[key];
  return PDF_FONT_SIZE_SCALE[selected] || 1;
}

function setPdfFontSize(pdf, size, kind = 'body') {
  pdf.setFontSize(size * pdfFontScale(kind));
}

function safePdfFont(font) {
  return PDF_FONT_MAP[font] || (['helvetica', 'times', 'courier'].includes(font) ? font : 'helvetica');
}

function setPdfFont(pdf, kind = 'body', style = 'normal') {
  const key = kind === 'title' ? 'titleFont' : kind === 'price' ? 'priceFont' : 'bodyFont';
  const selected = state.settings[key] || DEFAULT_SETTINGS[key];
  let finalStyle = style;

  if (selected === 'freestyle') {
    if (style === 'bold') finalStyle = 'bolditalic';
    else if (style === 'normal') finalStyle = 'italic';
  }

  pdf.setFont(safePdfFont(selected), finalStyle);
}

function formatDeliveryFee(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^r\$/i.test(raw)) return raw;
  return `R$ ${raw}`;
}

function normalizeHex(hex, fallback = '#ffffff') {
  const value = String(hex || '').trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function colorIsWhite(hex) {
  return normalizeHex(hex).toLowerCase() === '#ffffff';
}

function internalPageColor() {
  const pageColor = normalizeHex(activeCatalogPalette().pdfPageColor, DEFAULT_SETTINGS.pdfPageColor);
  return colorIsWhite(pageColor) ? normalizeHex(activeCatalogPalette().backgroundColor, DEFAULT_SETTINGS.backgroundColor) : pageColor;
}

function readableOnColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#263026' : '#ffffff';
}

function containedImageRect(image, x, y, w, h) {
  if (!image?.dataUrl || !image.width || !image.height) return null;
  const scale = Math.min(w / image.width, h / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  return {
    x: x + (w - drawW) / 2,
    y: y + (h - drawH) / 2,
    w: drawW,
    h: drawH
  };
}

function roundedCanvasPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function roundedContainedImageDataUrl(image, targetWmm, targetHmm, radiusMm) {
  if (!image?.element) return '';

  const canvasW = Math.max(160, Math.round(targetWmm * 14));
  const canvasH = Math.max(120, Math.round(targetHmm * 14));
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, canvasW, canvasH);
  roundedCanvasPath(ctx, 0, 0, canvasW, canvasH, Math.max(4, Math.round(radiusMm * 14)));
  ctx.clip();

  const scale = Math.min(canvasW / image.width, canvasH / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const dx = (canvasW - drawW) / 2;
  const dy = (canvasH - drawH) / 2;
  ctx.drawImage(image.element, dx, dy, drawW, drawH);

  return canvas.toDataURL('image/png');
}

function addImageContained(pdf, image, x, y, w, h, alias) {
  const rect = containedImageRect(image, x, y, w, h);
  if (!rect) return false;
  pdf.addImage(image.dataUrl, imageType(image.dataUrl), rect.x, rect.y, rect.w, rect.h, alias, 'FAST');
  return true;
}

function addImageContainedRounded(pdf, image, x, y, w, h, alias, radius = 2.4) {
  const rect = containedImageRect(image, x, y, w, h);
  if (!rect) return false;

  const roundedDataUrl = roundedContainedImageDataUrl(image, rect.w, rect.h, radius);
  if (roundedDataUrl) {
    pdf.addImage(roundedDataUrl, 'PNG', rect.x, rect.y, rect.w, rect.h, alias, 'FAST');
    return true;
  }

  try {
    if (typeof pdf.saveGraphicsState === 'function' && typeof pdf.restoreGraphicsState === 'function' && typeof pdf.clip === 'function') {
      pdf.saveGraphicsState();
      pdf.roundedRect(rect.x, rect.y, rect.w, rect.h, radius, radius, null);
      pdf.clip();
      pdf.addImage(image.dataUrl, imageType(image.dataUrl), rect.x, rect.y, rect.w, rect.h, alias, 'FAST');
      pdf.restoreGraphicsState();
      return true;
    }
  } catch (error) {
    try { pdf.restoreGraphicsState?.(); } catch (_restoreError) {}
    console.warn('Não foi possível arredondar a imagem no PDF.', error);
  }

  pdf.addImage(image.dataUrl, imageType(image.dataUrl), rect.x, rect.y, rect.w, rect.h, alias, 'FAST');
  return true;
}

async function imageUrlToDataUrl(url) {
  if (!url) return '';
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error('Não foi possível carregar uma imagem.');
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function imageUrlToImageData(url) {
  if (!url) return null;
  let dataUrl = await imageUrlToDataUrl(url);
  const img = await loadImage(dataUrl);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  if (!String(dataUrl).toLowerCase().startsWith('data:image/png') &&
      !String(dataUrl).toLowerCase().startsWith('data:image/jpeg') &&
      !String(dataUrl).toLowerCase().startsWith('data:image/jpg')) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    dataUrl = canvas.toDataURL('image/png');
  }

  return { dataUrl, width, height, element: img };
}

async function removeWhiteBackground(image, tolerance = 246) {
  if (!image?.dataUrl) return image;
  try {
    const img = await loadImage(image.dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = data.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (r >= tolerance && g >= tolerance && b >= tolerance) {
        const distanceFromWhite = Math.max(255 - r, 255 - g, 255 - b);
        pixels[i + 3] = Math.max(0, Math.min(255, distanceFromWhite * 18));
      }
    }
    ctx.putImageData(data, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), width: image.width, height: image.height };
  } catch (error) {
    console.warn('Não foi possível remover fundo branco da imagem promocional.', error);
    return image;
  }
}

async function fitImageToBox(dataUrl, width = 1000, height = 760, quality = 0.9, fill = '#ffffff') {
  if (!dataUrl) return '';
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / img.width, height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = (width - drawW) / 2;
  const dy = (height - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);

  return canvas.toDataURL('image/jpeg', quality);
}

function splitLines(pdf, text, maxWidth, maxLines) {
  const lines = pdf.splitTextToSize(String(text || ''), maxWidth);
  if (lines.length <= maxLines) return lines;
  const out = lines.slice(0, maxLines);
  out[maxLines - 1] = out[maxLines - 1].replace(/\s+\S*$/, '') + '...';
  return out;
}

function pdfFileName() {
  const name = (state.settings.businessName || 'catalogo').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `${name || 'catalogo'}-${date}.pdf`;
}

async function generateCatalogPdf({ onlyAvailable = true } = {}) {
  const button = $('generatePdfBtn');
  const quickButton = $('quickPdfBtn');
  const dashboardButton = $('dashboardPdfBtn');
  try {
    if (!window.jspdf?.jsPDF) {
      toast('Biblioteca de PDF ainda carregando. Tente novamente.', 'error');
      return;
    }
    if (button) button.disabled = true;
    if (quickButton) quickButton.disabled = true;
    if (dashboardButton) dashboardButton.disabled = true;
    toast('Preparando imagens e montando o PDF...');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    const productPool = state.products.filter((p) => onlyAvailable ? p.disponivel : true);
    const sortedCategories = [...state.categories].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
    const categoryGroups = sortedCategories
      .map((category) => ({
        category,
        products: productPool
          .filter((p) => p.categoriaId === category.id)
          .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
      }))
      .filter((group) => group.products.length > 0);

    const uncategorized = productPool
      .filter((p) => !state.categories.some((category) => category.id === p.categoriaId))
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    if (uncategorized.length) {
      categoryGroups.push({ category: { nome: 'Sem categoria' }, products: uncategorized });
    }

    const imageCache = new Map();
    const getImage = async (url) => {
      if (!url) return null;
      if (imageCache.has(url)) return imageCache.get(url);
      try {
        const data = await imageUrlToImageData(url);
        imageCache.set(url, data);
        return data;
      } catch (error) {
        console.warn('Falha ao carregar imagem para PDF', error);
        return null;
      }
    };

    const coverImage = await getImage(state.assets.coverUrl);
    const logoImage = await getImage(state.assets.logoUrl);
    const iconImage = await getImage(state.assets.iconUrl);
    const whatsappIcon = await getImage(state.assets.whatsappIconUrl);
    const deliveryIcon = await getImage(state.assets.deliveryIconUrl);
    const locationIcon = await getImage(state.assets.locationIconUrl);
    const rawPromoImage = await getImage(state.assets.promoImageUrl);
    const promoImage = rawPromoImage ? await removeWhiteBackground(rawPromoImage) : null;
    const catalogBackground = await getImage(selectedCatalogBackgroundUrl());

    drawCover(pdf, { coverImage, logoImage, iconImage, whatsappIcon, deliveryIcon, locationIcon, catalogBackground });

    const layout = {
      cols: 2,
      left: 4,
      top: 9,
      gapX: 1.2,
      gapY: 2.8,
      cardW: 100.4,
      cardH: 52,
      categoryH: 12,
      bottom: state.settings.showPromoFooter ? 266 : 289
    };

    let col = 0;
    let y = layout.top;
    let hasContentOnPage = false;

    const drawInternalPage = () => {
      drawInternalBackground(pdf, catalogBackground);
      col = 0;
      y = layout.top;
      hasContentOnPage = false;
    };

    const addInternalPage = () => {
      if (pdf.getNumberOfPages() > 1) drawPromoFooter(pdf, promoImage);
      pdf.addPage();
      drawInternalPage();
    };

    const finishPartialRow = (fromCol = col) => {
      if (fromCol > 0 && fromCol < layout.cols) {
        y += layout.cardH + layout.gapY;
        col = 0;
      }
    };

    const ensureSpace = (heightNeeded) => {
      if (y + heightNeeded <= layout.bottom) return;
      addInternalPage();
    };

    addInternalPage();

    if (!categoryGroups.length) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      setTextHex(pdf, state.settings.primaryColor);
      pdf.text('Nenhum produto disponível para o PDF.', 105, 130, { align: 'center' });
      drawPromoFooter(pdf, promoImage);
      pdf.save(pdfFileName());
      return;
    }

    for (const group of categoryGroups) {
      finishPartialRow();
      ensureSpace(layout.categoryH + layout.cardH);
      drawCategoryTitle(pdf, group.category.nome, layout.left, y, 202);
      y += layout.categoryH;
      hasContentOnPage = true;

      for (const product of group.products) {
        if (col === 0) ensureSpace(layout.cardH);
        if (y + layout.cardH > layout.bottom) {
          addInternalPage();
          drawCategoryTitle(pdf, group.category.nome, layout.left, y, 202);
          y += layout.categoryH;
        }

        const x = layout.left + col * (layout.cardW + layout.gapX);
        const productImage = await getImage(product.imagemUrl);
        drawProductCard(pdf, product, x, y, layout.cardW, layout.cardH, productImage);
        hasContentOnPage = true;
        col += 1;

        if (col >= layout.cols) {
          col = 0;
          y += layout.cardH + layout.gapY;
        }
      }

      finishPartialRow();
    }

    drawPromoFooter(pdf, promoImage);
    pdf.save(pdfFileName());
    toast('PDF gerado com sucesso.');
  } catch (error) {
    console.error(error);
    toast('Erro ao gerar o PDF.', 'error');
  } finally {
    if (button) button.disabled = false;
    if (quickButton) quickButton.disabled = false;
    if (dashboardButton) dashboardButton.disabled = false;
  }
}

function imageType(dataUrl = '') {
  return String(dataUrl).toLowerCase().startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

function drawPdfFullPageBackground(pdf, backgroundImage, fallbackColor = '#ffffff', alias = 'catalog-background') {
  setFillHex(pdf, fallbackColor);
  pdf.rect(0, 0, 210, 297, 'F');

  if (!backgroundImage?.dataUrl) return;

  pdf.addImage(
    backgroundImage.dataUrl,
    imageType(backgroundImage.dataUrl),
    0,
    0,
    210,
    297,
    alias,
    'FAST'
  );
}

function withPdfOpacity(pdf, opacity, callback) {
  let didSave = false;
  try {
    const GState = pdf.GState || window.jspdf?.GState;
    if (typeof pdf.setGState === 'function' && GState) {
      if (typeof pdf.saveGraphicsState === 'function') {
        pdf.saveGraphicsState();
        didSave = true;
      }
      pdf.setGState(new GState({ opacity }));
      callback();
      if (didSave && typeof pdf.restoreGraphicsState === 'function') pdf.restoreGraphicsState();
      return;
    }
  } catch (_error) {
    if (didSave && typeof pdf.restoreGraphicsState === 'function') {
      try { pdf.restoreGraphicsState(); } catch (_restoreError) {}
    }
  }
  callback();
}

function fillRoundedRectWithOpacity(pdf, x, y, w, h, rx, ry, color, opacity = 0.86) {
  setFillHex(pdf, color);
  withPdfOpacity(pdf, opacity, () => pdf.roundedRect(x, y, w, h, rx, ry, 'F'));
}

function drawSimpleFlower(pdf, cx, cy, scale = 1, petalColor = '#5f7f5a', centerColor = '#d69a8b') {
  setFillHex(pdf, petalColor);
  const r = 3.2 * scale;
  pdf.circle(cx, cy - 5 * scale, r, 'F');
  pdf.circle(cx + 4.5 * scale, cy - 1.2 * scale, r, 'F');
  pdf.circle(cx + 2.8 * scale, cy + 4.2 * scale, r, 'F');
  pdf.circle(cx - 2.8 * scale, cy + 4.2 * scale, r, 'F');
  pdf.circle(cx - 4.5 * scale, cy - 1.2 * scale, r, 'F');
  setFillHex(pdf, centerColor);
  pdf.circle(cx, cy, 2.1 * scale, 'F');
}

function drawCover(pdf, { coverImage, logoImage, iconImage, whatsappIcon, deliveryIcon, locationIcon, catalogBackground }) {
  const w = 210;
  const primary = normalizeHex(activeCatalogPalette().primaryColor, DEFAULT_SETTINGS.primaryColor);
  const accent = normalizeHex(activeCatalogPalette().accentColor, DEFAULT_SETTINGS.accentColor);
  const coverBg = normalizeHex(activeCatalogPalette().backgroundColor, DEFAULT_SETTINGS.backgroundColor);
  const cardColor = normalizeHex(activeCatalogPalette().pdfCardColor, '#fffaf1');
  const softAccent = mixHex(accent, coverBg, 0.72);

  drawPdfFullPageBackground(pdf, catalogBackground, coverBg, 'fundo-capa');

  fillRoundedRectWithOpacity(pdf, 16, 17, 178, 263, 7, 7, cardColor, 0.84);
  setDrawHex(pdf, softAccent);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(20, 21, 170, 255, 5, 5, 'S');

  if (logoImage) {
    addImageContained(pdf, logoImage, 34, 36, 142, 60, 'logo-capa');
  } else if (iconImage) {
    addImageContained(pdf, iconImage, 91, 40, 28, 28, 'icone-capa');
  } else {
    drawSimpleFlower(pdf, 105, 52, 1.08, primary, accent);
  }

  const catalogTitle = String(state.settings.catalogTitle || DEFAULT_SETTINGS.catalogTitle).trim();
  setPdfFont(pdf, 'title', 'bold');
  pdf.setFontSize(29);
  setTextHex(pdf, primary);
  pdf.text(splitLines(pdf, catalogTitle, 150, 2), 105, 110, { align: 'center', maxWidth: 150, lineHeightFactor: 1.03 });

  setDrawHex(pdf, accent);
  pdf.setLineWidth(0.32);
  pdf.line(60, 120, 150, 120);

  if (coverImage) {
    fillRoundedRectWithOpacity(pdf, 28, 128, 154, 66, 5, 5, '#ffffff', 0.74);
    setDrawHex(pdf, softAccent);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(28, 128, 154, 66, 5, 5, 'S');
    addImageContainedRounded(pdf, coverImage, 32, 132, 146, 58, 'foto-capa', 3.2);
  }

  const subtitle = String(state.settings.catalogSubtitle || '').trim();
  if (subtitle) {
    setPdfFont(pdf, 'body', 'italic');
    pdf.setFontSize(14.2);
    setTextHex(pdf, primary);
    pdf.text(subtitle, 105, coverImage ? 214 : 170, { align: 'center', maxWidth: 155, lineHeightFactor: 1.15 });
  }

  const phone = String(state.settings.businessPhone || '').trim();
  const address = String(state.settings.businessAddress || '').trim();
  const deliveryFee = formatDeliveryFee(state.settings.deliveryFee || DEFAULT_SETTINGS.deliveryFee);
  const items = [
    { label: 'WHATSAPP', value: phone || 'Consulte pelo WhatsApp', icon: whatsappIcon },
    { label: 'ENTREGA', value: deliveryFee ? `Taxa ${deliveryFee}` : 'Taxa de entrega', icon: deliveryIcon },
    { label: 'LOCAL', value: address || 'Endereço da floricultura', icon: locationIcon }
  ];

  const itemW = 55;
  const itemGap = 5;
  const itemsTotalW = itemW * items.length + itemGap * (items.length - 1);
  const startX = (w - itemsTotalW) / 2;

  items.forEach((item, index) => {
    const x = startX + index * (itemW + itemGap);
    const boxY = 232;
    const boxH = 31;

    fillRoundedRectWithOpacity(pdf, x, boxY, itemW, boxH, 4, 4, '#ffffff', 0.78);
    setDrawHex(pdf, softAccent);
    pdf.setLineWidth(0.22);
    pdf.roundedRect(x, boxY, itemW, boxH, 4, 4, 'S');

    if (item.icon) {
      addImageContained(pdf, item.icon, x + 4.2, boxY + 9.2, 11.5, 11.5, `cover-icon-${index}`);
    } else {
      setFillHex(pdf, mixHex(accent, '#ffffff', 0.18));
      pdf.circle(x + 10, boxY + 15.2, 5.4, 'F');
      setPdfFont(pdf, 'body', 'bold');
      setPdfFontSize(pdf, 7.8, 'body');
      pdf.setTextColor(255, 255, 255);
      pdf.text(index === 0 ? 'W' : index === 1 ? 'E' : 'L', x + 10, boxY + 18.0, { align: 'center' });
    }

    setPdfFont(pdf, 'body', 'bold');
    setPdfFontSize(pdf, 8.0, 'body');
    setTextHex(pdf, primary);
    pdf.text(item.label, x + 18, boxY + 9.3, { maxWidth: 33 });

    setPdfFont(pdf, 'body', 'normal');
    setPdfFontSize(pdf, 7.15, 'body');
    setTextHex(pdf, '#4d554c');
    pdf.text(splitLines(pdf, item.value, 34, 3), x + 18, boxY + 16.4, { maxWidth: 34, lineHeightFactor: 1.04 });
  });
}

function drawInternalBackground(pdf, catalogBackground) {
  const bg = internalPageColor();
  drawPdfFullPageBackground(pdf, catalogBackground, bg, 'fundo-interno');
}

function drawHeader() {
  // Sem cabeçalho nas páginas internas para economizar espaço e evitar textos repetidos.
}

function drawCategoryTitle(pdf, title, x, y, width) {
  const primary = normalizeHex(activeCatalogPalette().primaryColor, DEFAULT_SETTINGS.primaryColor);
  const accent = normalizeHex(activeCatalogPalette().accentColor, DEFAULT_SETTINGS.accentColor);
  const bg = internalPageColor();
  const headerBg = mixHex(primary, bg, 0.07);
  const border = mixHex(accent, bg, 0.16);

  fillRoundedRectWithOpacity(pdf, x, y, width, 10.8, 2.8, 2.8, headerBg, 0.82);
  setDrawHex(pdf, border);
  pdf.setLineWidth(0.22);
  pdf.roundedRect(x, y, width, 10.8, 2.8, 2.8, 'S');

  setFillHex(pdf, mixHex(accent, bg, 0.10));
  withPdfOpacity(pdf, 0.42, () => pdf.rect(x + 4, y + 9.4, width - 8, 0.45, 'F'));

  setPdfFont(pdf, 'title', 'bold');
  setPdfFontSize(pdf, 13.8, 'title');
  setTextHex(pdf, primary);
  pdf.text(String(title || 'Produtos').toUpperCase(), x + 5, y + 7.2, { maxWidth: width - 10 });
}

function drawEmptyProductDecoration(pdf, x, y, w, h) {
  // Sem decoração para espaços vazios entre categorias.
}

function drawPageRemainderDecoration(pdf, y, bottom) {
  // Sem decoração automática no espaço restante.
}

function drawProductCard(pdf, product, x, y, w, h, image) {
  const cardColor = normalizeHex(activeCatalogPalette().pdfCardColor, '#fffaf1');
  const accent = normalizeHex(activeCatalogPalette().accentColor, DEFAULT_SETTINGS.accentColor);
  const textColor = normalizeHex(activeCatalogPalette().pdfTextColor, DEFAULT_SETTINGS.pdfTextColor);
  const bg = internalPageColor();
  const softBorder = mixHex(accent, bg, 0.48);

  fillRoundedRectWithOpacity(pdf, x, y, w, h, 3.2, 3.2, cardColor, 0.86);
  setDrawHex(pdf, softBorder);
  pdf.setLineWidth(0.26);
  pdf.roundedRect(x, y, w, h, 3.2, 3.2, 'S');

  const padding = 1.5;
  const imageW = 50;
  const imageH = h - 3;
  const imageX = x + w - imageW - padding;
  const imageY = y + 1.5;
  const textX = x + 2.4;
  const textW = Math.max(34, imageX - textX - 1.2);

  if (image) {
    fillRoundedRectWithOpacity(pdf, imageX, imageY, imageW, imageH, 3.2, 3.2, '#ffffff', 0.64);
    addImageContainedRounded(pdf, image, imageX, imageY, imageW, imageH, `produto-${product.id}`, 3.2);
  } else {
    drawSimpleFlower(pdf, imageX + imageW / 2, imageY + imageH / 2, 0.58, activeCatalogPalette().primaryColor, activeCatalogPalette().secondaryColor);
  }

  const descricao = String(product.descricao || '').trim();
  const hasDescricao = descricao.length > 0;

  setTextHex(pdf, textColor);
  setPdfFont(pdf, 'title', 'bold');
  pdf.setFontSize(hasDescricao ? 13.5 : 14.2);
  const nameLines = splitLines(pdf, product.nome, textW, hasDescricao ? 3 : 2);
  pdf.text(nameLines, textX, hasDescricao ? y + 8.2 : y + 15.5, { lineHeightFactor: 1.03 });

  if (hasDescricao) {
    setTextHex(pdf, textColor);
    setPdfFont(pdf, 'body', 'normal');
    pdf.setFontSize(8.8);
    const descLines = splitLines(pdf, descricao, textW, 3);
    pdf.text(descLines, textX, y + 24.2, { lineHeightFactor: 1.06 });
  }

  const lineY = hasDescricao ? y + h - 15 : y + 24.8;
  const priceY = hasDescricao ? y + h - 5.5 : y + 32.4;
  setDrawHex(pdf, accent);
  pdf.setLineWidth(0.2);
  pdf.line(textX, lineY, textX + Math.min(27, textW), lineY);

  setTextHex(pdf, accent);
  setPdfFont(pdf, 'price', 'bold');
  pdf.setFontSize(hasDescricao ? 12.2 : 12.9);
  pdf.text(formatCurrency(product.preco), textX, priceY, { maxWidth: textW });
}

function drawPromoFooter(pdf, promoImage) {
  if (!state.settings.showPromoFooter) return;

  const y = 270;
  const h = 27;
  const bg = normalizeHex(activeCatalogPalette().promoBackgroundColor, DEFAULT_SETTINGS.primaryColor);
  const accent = normalizeHex(activeCatalogPalette().accentColor, DEFAULT_SETTINGS.accentColor);

  fillRoundedRectWithOpacity(pdf, 0, y, 210, h, 0, 0, bg, 0.70);
  setDrawHex(pdf, accent);
  pdf.setLineWidth(0.35);
  pdf.line(10, y + 1.5, 200, y + 1.5);

  setPdfFont(pdf, 'title', 'bold');
  pdf.setFontSize(12.7);
  pdf.setTextColor(255, 255, 255);
  const lines = String(state.settings.promoFooter || DEFAULT_SETTINGS.promoFooter).split('\\n').slice(0, 2);
  pdf.text(lines, 18, y + 10, { maxWidth: 123, lineHeightFactor: 1.12 });

  if (promoImage) {
    addImageContainedRounded(pdf, promoImage, 148, y + 1.5, 48, 24, 'rodape-promo', 2.2);
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });

    registration.update().catch(() => {});

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  } catch (error) {
    console.warn('Não foi possível registrar o service worker.', error);
  }
}

function safeInit(label, callback) {
  try {
    callback();
  } catch (error) {
    console.error(`Falha ao iniciar ${label}.`, error);
  }
}

safeInit('navegação', bindNavigation);
safeInit('login', bindAuth);
safeInit('produtos', bindProductUi);
safeInit('categorias', bindCategoryUi);
safeInit('imagens fixas', bindAssetsUi);
safeInit('aparência do PDF', bindSettingsUi);
safeInit('PDF', bindPdfUi);
safeInit('tema', setThemeVariables);
safeInit('service worker', registerServiceWorker);

window.addEventListener('DOMContentLoaded', () => {
  const select = $('catalogBackgroundMode');
  if (select) {
    [...select.options].forEach((opt) => {
      if (opt.value === 'custom' || opt.value === 'none') opt.remove();
    });
    if (!select.value) select.value = DEFAULT_SETTINGS.catalogBackgroundMode;
  }
  renderCatalogBackgroundPreview();
});
