import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseConfig, ADMIN_EMAIL } from './supabase-config.js';

const STORAGE_BUCKET = 'catalogo-imagens';

const DEFAULT_SETTINGS = {
  businessName: 'Sua Floricultura',
  catalogSubtitle: 'Flores, presentes e carinho em cada detalhe',
  businessPhone: '',
  businessAddress: '',
  primaryColor: '#5f7f5a',
  secondaryColor: '#d69a8b',
  backgroundColor: '#f7f2ea',
  accentColor: '#c58f42',
  promoFooter: 'Adicione chocolate ou pelúcia\npara deixar seu pedido ainda mais especial',
  hideUnavailablePdf: true,
  showPromoFooter: true
};

const DEFAULT_ASSETS = {
  logoUrl: '', logoPath: '',
  coverUrl: '', coverPath: '',
  iconUrl: '', iconPath: ''
};

const state = {
  products: [],
  categories: [],
  settings: { ...DEFAULT_SETTINGS },
  assets: { ...DEFAULT_ASSETS },
  editingProduct: null,
  supabaseReady: false
};

const $ = (id) => document.getElementById(id);

const pageData = {
  dashboard: ['Início', 'Resumo dos produtos e opções do catálogo.'],
  produtos: ['Produtos', 'Cadastre, altere, exclua e controle a disponibilidade.'],
  categorias: ['Categorias', 'Organize a ordem das categorias no PDF.'],
  imagens: ['Imagens fixas', 'Cadastre logotipo, foto da capa e ícone decorativo.'],
  aparencia: ['Aparência do PDF', 'Escolha cores, informações da capa e rodapé promocional.'],
  pdf: ['Gerar PDF', 'Crie o catálogo bonito para enviar aos clientes.']
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
  document.documentElement.style.setProperty('--primary', state.settings.primaryColor || DEFAULT_SETTINGS.primaryColor);
  document.documentElement.style.setProperty('--secondary', state.settings.secondaryColor || DEFAULT_SETTINGS.secondaryColor);
  document.documentElement.style.setProperty('--background', state.settings.backgroundColor || DEFAULT_SETTINGS.backgroundColor);
  document.documentElement.style.setProperty('--accent', state.settings.accentColor || DEFAULT_SETTINGS.accentColor);
}

function bindNavigation() {
  document.querySelectorAll('.tabs button').forEach((btn) => {
    btn.addEventListener('click', () => openTab(btn.dataset.tab));
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
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, async () => {
      await loadProducts();
      renderProducts();
      renderStats();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, async () => {
      await loadSettings();
      await loadAssets();
      setThemeVariables();
      fillSettingsForm();
      renderAssetPreviews();
      $('pdfOnlyAvailable').checked = !!state.settings.hideUnavailablePdf;
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
  $('pdfOnlyAvailable').checked = !!state.settings.hideUnavailablePdf;
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
    state.settings = { ...DEFAULT_SETTINGS };
    return;
  }
  state.settings = { ...DEFAULT_SETTINGS, ...(data.dados || {}) };
}

async function loadAssets() {
  const { data, error } = await supabase.from('configuracoes').select('dados').eq('id', 'assets').maybeSingle();
  if (error) throw error;
  if (!data) {
    await supabase.from('configuracoes').upsert({ id: 'assets', dados: DEFAULT_ASSETS, atualizado_em: nowIso() });
    state.assets = { ...DEFAULT_ASSETS };
    return;
  }
  state.assets = { ...DEFAULT_ASSETS, ...(data.dados || {}) };
}

function bindProductUi() {
  $('newProductBtn').addEventListener('click', () => openProductDialog());
  $('closeProductDialog').addEventListener('click', () => $('productDialog').close());
  $('cancelProductBtn').addEventListener('click', () => $('productDialog').close());
  $('productSearch').addEventListener('input', renderProducts);
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
    renderStats();
    $('productDialog').close();
  } catch (error) {
    console.error(error);
    toast('Erro ao salvar produto.', 'error');
  }
}

function categoryName(categoryId) {
  return state.categories.find((c) => c.id === categoryId)?.nome || 'Sem categoria';
}

function renderProducts() {
  const list = $('productsList');
  const search = $('productSearch')?.value?.trim()?.toLowerCase() || '';
  const products = state.products.filter((p) => {
    const haystack = `${p.nome || ''} ${p.descricao || ''} ${categoryName(p.categoriaId)}`.toLowerCase();
    return haystack.includes(search);
  });

  if (!products.length) {
    list.innerHTML = '<div class="welcome-card">Nenhum produto encontrado.</div>';
    return;
  }

  list.innerHTML = products.map((p) => `
    <article class="product-card">
      <div class="product-card-img">${p.imagemUrl ? `<img src="${escapeHtml(p.imagemUrl)}" alt="${escapeHtml(p.nome)}">` : '<span class="no-image">✿</span>'}</div>
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
    renderStats();
  }
  if (action === 'delete') {
    if (!confirm(`Excluir o produto "${product.nome}"?`)) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) return toast('Erro ao excluir produto.', 'error');
    await deleteStoragePath(product.imagemPath);
    await loadProducts();
    renderProducts();
    renderStats();
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
      <input class="category-name-input" value="${escapeHtml(c.nome)}" data-id="${c.id}" aria-label="Nome da categoria">
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
  }
}

function bindAssetsUi() {
  const map = [
    ['logoInput', 'logoUrl', 'logoPath', 'logotipo'],
    ['coverInput', 'coverUrl', 'coverPath', 'capa'],
    ['iconInput', 'iconUrl', 'iconPath', 'icone']
  ];
  map.forEach(([inputId, urlKey, pathKey, folder]) => {
    $(inputId).addEventListener('change', async () => {
      const file = $(inputId).files[0];
      if (!file) return;
      try {
        const uploaded = await uploadImage(file, `assets/${folder}`);
        const previousPath = state.assets[pathKey];
        const nextAssets = {
          ...state.assets,
          [urlKey]: uploaded.url,
          [pathKey]: uploaded.path
        };
        const { error } = await supabase.from('configuracoes').upsert({
          id: 'assets',
          dados: nextAssets,
          atualizado_em: nowIso()
        });
        if (error) throw error;
        state.assets = nextAssets;
        await deleteStoragePath(previousPath);
        renderAssetPreviews();
        $(inputId).value = '';
        toast('Imagem fixa atualizada.');
      } catch (error) {
        console.error(error);
        toast('Erro ao enviar imagem.', 'error');
      }
    });
  });
}

function renderAssetPreviews() {
  renderAssetPreview('logoPreview', state.assets.logoUrl, 'Nenhum logotipo');
  renderAssetPreview('coverPreview', state.assets.coverUrl, 'Nenhuma foto de capa');
  renderAssetPreview('iconPreview', state.assets.iconUrl, 'Nenhum ícone');
}

function renderAssetPreview(id, url, emptyText) {
  $(id).innerHTML = url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(emptyText)}">` : emptyText;
}

function bindSettingsUi() {
  $('settingsForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      businessName: $('businessName').value.trim(),
      catalogSubtitle: $('catalogSubtitle').value.trim(),
      businessPhone: $('businessPhone').value.trim(),
      businessAddress: $('businessAddress').value.trim(),
      primaryColor: $('primaryColor').value,
      secondaryColor: $('secondaryColor').value,
      backgroundColor: $('backgroundColor').value,
      accentColor: $('accentColor').value,
      promoFooter: $('promoFooter').value.trim(),
      hideUnavailablePdf: $('hideUnavailablePdf').checked,
      showPromoFooter: $('showPromoFooter').checked
    };
    const { error } = await supabase.from('configuracoes').upsert({
      id: 'visual',
      dados: payload,
      atualizado_em: nowIso()
    });
    if (error) return toast('Erro ao salvar aparência.', 'error');
    state.settings = { ...DEFAULT_SETTINGS, ...payload };
    setThemeVariables();
    $('pdfOnlyAvailable').checked = !!state.settings.hideUnavailablePdf;
    toast('Aparência salva.');
  });
}

function fillSettingsForm() {
  $('businessName').value = state.settings.businessName || '';
  $('catalogSubtitle').value = state.settings.catalogSubtitle || '';
  $('businessPhone').value = state.settings.businessPhone || '';
  $('businessAddress').value = state.settings.businessAddress || '';
  $('primaryColor').value = state.settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
  $('secondaryColor').value = state.settings.secondaryColor || DEFAULT_SETTINGS.secondaryColor;
  $('backgroundColor').value = state.settings.backgroundColor || DEFAULT_SETTINGS.backgroundColor;
  $('accentColor').value = state.settings.accentColor || DEFAULT_SETTINGS.accentColor;
  $('promoFooter').value = state.settings.promoFooter || '';
  $('hideUnavailablePdf').checked = !!state.settings.hideUnavailablePdf;
  $('showPromoFooter').checked = !!state.settings.showPromoFooter;
}

function renderStats() {
  $('statTotal').textContent = state.products.length;
  $('statAvailable').textContent = state.products.filter((p) => p.disponivel).length;
  $('statUnavailable').textContent = state.products.filter((p) => !p.disponivel).length;
  $('statCategories').textContent = state.categories.length;
}

function bindPdfUi() {
  $('generatePdfBtn').addEventListener('click', () => generateCatalogPdf({ onlyAvailable: $('pdfOnlyAvailable').checked }));
  $('quickPdfBtn').addEventListener('click', () => {
    openTab('pdf');
    generateCatalogPdf({ onlyAvailable: $('pdfOnlyAvailable').checked });
  });
}

function hexToRgb(hex) {
  const clean = String(hex || '#000000').replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function setFillHex(pdf, hex) { pdf.setFillColor(...hexToRgb(hex)); }
function setDrawHex(pdf, hex) { pdf.setDrawColor(...hexToRgb(hex)); }
function setTextHex(pdf, hex) { pdf.setTextColor(...hexToRgb(hex)); }

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

async function cropImage(dataUrl, width = 1000, height = 760, quality = 0.88) {
  if (!dataUrl) return '';
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const sourceRatio = img.width / img.height;
  const targetRatio = width / height;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (sourceRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
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
  try {
    if (!window.jspdf?.jsPDF) {
      toast('Biblioteca de PDF ainda carregando. Tente novamente.', 'error');
      return;
    }
    button.disabled = true;
    quickButton.disabled = true;
    toast('Preparando imagens e montando o PDF...');

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

    const productPool = state.products.filter((p) => onlyAvailable ? p.disponivel : true);
    const sortedCategories = [...state.categories].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

    const imageCache = new Map();
    const getImage = async (url, cropW, cropH) => {
      if (!url) return '';
      const key = `${url}|${cropW}|${cropH}`;
      if (imageCache.has(key)) return imageCache.get(key);
      try {
        const data = await imageUrlToDataUrl(url);
        const cropped = await cropImage(data, cropW, cropH);
        imageCache.set(key, cropped);
        return cropped;
      } catch (error) {
        console.warn('Falha ao carregar imagem para PDF', error);
        return '';
      }
    };

    const coverImage = await getImage(state.assets.coverUrl, 1200, 1700);
    const logoImage = state.assets.logoUrl ? await imageUrlToDataUrl(state.assets.logoUrl).catch(() => '') : '';
    const iconImage = state.assets.iconUrl ? await imageUrlToDataUrl(state.assets.iconUrl).catch(() => '') : '';

    drawCover(pdf, { coverImage, logoImage, iconImage });

    if (!productPool.length) {
      pdf.addPage();
      drawInternalBackground(pdf);
      drawHeader(pdf, 'Catálogo');
      drawPromoFooter(pdf, 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      setTextHex(pdf, state.settings.primaryColor);
      pdf.text('Nenhum produto disponível para o PDF.', 105, 135, { align: 'center' });
      pdf.save(pdfFileName());
      return;
    }

    let pageNo = 1;
    pdf.addPage();
    pageNo += 1;
    drawInternalBackground(pdf);
    drawHeader(pdf, 'Catálogo');
    let y = 32;
    const left = 14;
    const gap = 8;
    const cardW = 86;
    const cardH = 100;
    const footerY = 268;
    let col = 0;

    const newInternalPage = (categoryTitle = '') => {
      drawPromoFooter(pdf, pageNo);
      pdf.addPage();
      pageNo += 1;
      drawInternalBackground(pdf);
      drawHeader(pdf, categoryTitle || 'Catálogo');
      y = 32;
      col = 0;
    };

    for (const category of sortedCategories) {
      const products = productPool.filter((p) => p.categoriaId === category.id)
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
      if (!products.length) continue;

      if (col !== 0) { col = 0; y += cardH + 8; }
      if (y + 18 > footerY) newInternalPage(category.nome);
      drawCategoryTitle(pdf, category.nome, y);
      y += 17;

      for (const product of products) {
        if (y + cardH > footerY) newInternalPage(category.nome);
        const x = left + col * (cardW + gap);
        const productImage = await getImage(product.imagemUrl, 900, 620);
        drawProductCard(pdf, product, category.nome, x, y, cardW, cardH, productImage, iconImage);
        if (col === 0) {
          col = 1;
        } else {
          col = 0;
          y += cardH + 8;
        }
      }
      if (col !== 0) {
        col = 0;
        y += cardH + 8;
      }
    }

    drawPromoFooter(pdf, pageNo);
    pdf.save(pdfFileName());
    toast('PDF gerado com sucesso.');
  } catch (error) {
    console.error(error);
    toast('Erro ao gerar o PDF.', 'error');
  } finally {
    button.disabled = false;
    quickButton.disabled = false;
  }
}


function imageType(dataUrl = '') {
  return String(dataUrl).startsWith('data:image/png') ? 'PNG' : 'JPEG';
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

function drawCover(pdf, { coverImage, logoImage, iconImage }) {
  const w = 210, h = 297;
  setFillHex(pdf, state.settings.backgroundColor);
  pdf.rect(0, 0, w, h, 'F');


  setFillHex(pdf, state.settings.secondaryColor);
  pdf.circle(22, 32, 34, 'F');
  setFillHex(pdf, state.settings.primaryColor);
  pdf.circle(194, 278, 46, 'F');
  setFillHex(pdf, state.settings.backgroundColor);
  pdf.circle(178, 18, 19, 'F');

  setFillHex(pdf, '#ffffff');
  pdf.roundedRect(22, 42, 166, 208, 8, 8, 'F');
  setDrawHex(pdf, state.settings.primaryColor);
  pdf.setLineWidth(0.7);
  pdf.roundedRect(26, 46, 158, 200, 8, 8, 'S');

  if (coverImage) {
    pdf.addImage(coverImage, 'JPEG', 34, 54, 142, 70, undefined, 'FAST');
    setFillHex(pdf, '#ffffff');
    pdf.roundedRect(73, 104, 64, 28, 7, 7, 'F');
  }

  if (logoImage) {
    pdf.addImage(logoImage, imageType(logoImage), 78, coverImage ? 107 : 56, 54, 28, undefined, 'FAST');
  } else {
    setFillHex(pdf, state.settings.primaryColor);
    pdf.circle(105, coverImage ? 116 : 72, 15, 'F');
    drawSimpleFlower(pdf, 105, coverImage ? 116 : 72, 1.1, '#ffffff', state.settings.secondaryColor);
  }

  pdf.setFont('times', 'bolditalic');
  pdf.setFontSize(28);
  setTextHex(pdf, state.settings.primaryColor);
  pdf.text(state.settings.businessName || 'Sua Floricultura', 105, coverImage ? 150 : 112, { align: 'center', maxWidth: 140 });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(34);
  setTextHex(pdf, state.settings.accentColor);
  pdf.text('Catálogo', 105, coverImage ? 178 : 143, { align: 'center' });

  pdf.setFont('times', 'italic');
  pdf.setFontSize(17);
  setTextHex(pdf, '#5b6258');
  pdf.text(state.settings.catalogSubtitle || 'Flores e presentes especiais', 105, coverImage ? 193 : 158, { align: 'center', maxWidth: 130 });

  setFillHex(pdf, state.settings.primaryColor);
  pdf.roundedRect(54, coverImage ? 211 : 178, 102, 14, 7, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Produtos selecionados para encantar', 105, coverImage ? 220 : 187, { align: 'center' });

  if (iconImage) {
    pdf.addImage(iconImage, imageType(iconImage), 92, coverImage ? 232 : 202, 26, 26, undefined, 'FAST');
  } else {
    drawSimpleFlower(pdf, 105, coverImage ? 245 : 215, 1.2, state.settings.secondaryColor, state.settings.primaryColor);
  }

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  setTextHex(pdf, '#6b7066');
  const contact = [state.settings.businessPhone, state.settings.businessAddress].filter(Boolean).join('  •  ');
  if (contact) pdf.text(contact, 105, coverImage ? 263 : 238, { align: 'center', maxWidth: 144 });

  pdf.setFontSize(9);
  pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 105, coverImage ? 281 : 262, { align: 'center' });
}

function drawInternalBackground(pdf) {
  setFillHex(pdf, state.settings.backgroundColor);
  pdf.rect(0, 0, 210, 297, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.rect(10, 18, 190, 250, 'F');
  setFillHex(pdf, '#ffffff');
  pdf.roundedRect(10, 18, 190, 250, 4, 4, 'F');
  setFillHex(pdf, state.settings.secondaryColor);
  pdf.circle(201, 18, 16, 'F');
  setFillHex(pdf, state.settings.primaryColor);
  pdf.circle(7, 260, 12, 'F');
}

function drawHeader(pdf, title) {
  setTextHex(pdf, state.settings.primaryColor);
  pdf.setFont('times', 'bolditalic');
  pdf.setFontSize(18);
  pdf.text(state.settings.businessName || 'Sua Floricultura', 15, 15);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  setTextHex(pdf, '#7a8177');
  pdf.text(title || 'Catálogo', 195, 15, { align: 'right' });
  setDrawHex(pdf, state.settings.secondaryColor);
  pdf.setLineWidth(0.5);
  pdf.line(15, 21, 195, 21);
}

function drawCategoryTitle(pdf, title, y) {
  setFillHex(pdf, state.settings.primaryColor);
  pdf.roundedRect(15, y, 74, 10, 5, 5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(title, 20, y + 6.8, { maxWidth: 64 });
  setDrawHex(pdf, state.settings.secondaryColor);
  pdf.line(94, y + 5, 195, y + 5);
}

function drawProductCard(pdf, product, category, x, y, w, h, image, iconImage) {
  pdf.setFillColor(255, 255, 255);
  setDrawHex(pdf, '#eadfd4');
  pdf.setLineWidth(0.28);
  pdf.roundedRect(x, y, w, h, 5, 5, 'FD');

  if (image) {
    pdf.addImage(image, 'JPEG', x + 4, y + 4, w - 8, 48, undefined, 'FAST');
  } else {
    setFillHex(pdf, state.settings.backgroundColor);
    pdf.roundedRect(x + 4, y + 4, w - 8, 48, 4, 4, 'F');
    pdf.setFont('times', 'italic');
    pdf.setFontSize(28);
    setTextHex(pdf, state.settings.primaryColor);
    drawSimpleFlower(pdf, x + w / 2, y + 28, 1, state.settings.primaryColor, state.settings.secondaryColor);
  }

  if (iconImage) {
    pdf.addImage(iconImage, imageType(iconImage), x + w - 18, y + 7, 10, 10, undefined, 'FAST');
  }

  setFillHex(pdf, state.settings.secondaryColor);
  pdf.roundedRect(x + 5, y + 56, Math.min(w - 10, 36 + category.length * 1.1), 7, 3.5, 3.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.8);
  pdf.text(category, x + 8, y + 60.8, { maxWidth: w - 16 });

  setTextHex(pdf, '#263026');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  const nameLines = splitLines(pdf, product.nome, w - 10, 2);
  pdf.text(nameLines, x + 5, y + 71);

  setTextHex(pdf, '#666d64');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const descLines = splitLines(pdf, product.descricao || 'Produto especial da floricultura.', w - 10, 3);
  pdf.text(descLines, x + 5, y + 81);

  setFillHex(pdf, state.settings.accentColor);
  pdf.roundedRect(x + 5, y + h - 13, 38, 9, 4.5, 4.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text(formatCurrency(product.preco), x + 24, y + h - 7, { align: 'center' });
}

function drawPromoFooter(pdf, pageNo) {
  if (!state.settings.showPromoFooter) return;
  const y = 272;
  setFillHex(pdf, state.settings.primaryColor);
  pdf.rect(0, y, 210, 25, 'F');
  setFillHex(pdf, state.settings.secondaryColor);
  pdf.circle(197, y + 13, 16, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const lines = String(state.settings.promoFooter || DEFAULT_SETTINGS.promoFooter).split('\n').slice(0, 2);
  pdf.text(lines, 105, y + 10, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(`Página ${pageNo}`, 198, 291, { align: 'right' });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

bindNavigation();
bindAuth();
bindProductUi();
bindCategoryUi();
bindAssetsUi();
bindSettingsUi();
bindPdfUi();
setThemeVariables();
registerServiceWorker();
