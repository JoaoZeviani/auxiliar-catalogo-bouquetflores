import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseConfig, ADMIN_EMAIL } from './supabase-config.js';

const STORAGE_BUCKET = 'catalogo-imagens';

const DEFAULT_SETTINGS = {
  businessName: 'Sua Floricultura',
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
  importedFixedImages: {}
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
  imagens: ['Imagens fixas', 'Cadastre logotipo, foto da capa, ícones e imagem promocional.'],
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
    ['iconInput', 'iconUrl', 'iconPath', 'icone'],
    ['whatsappIconInput', 'whatsappIconUrl', 'whatsappIconPath', 'icone-whatsapp'],
    ['deliveryIconInput', 'deliveryIconUrl', 'deliveryIconPath', 'icone-entrega'],
    ['locationIconInput', 'locationIconUrl', 'locationIconPath', 'icone-local'],
    ['promoImageInput', 'promoImageUrl', 'promoImagePath', 'rodape-promocional']
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
      deliveryFee: $('deliveryFee').value.trim(),
      titleFont: $('titleFont').value,
      bodyFont: $('bodyFont').value,
      priceFont: $('priceFont').value,
      primaryColor: $('primaryColor').value,
      secondaryColor: $('secondaryColor').value,
      backgroundColor: $('backgroundColor').value,
      accentColor: $('accentColor').value,
      pdfPageColor: $('pdfPageColor').value,
      pdfCardColor: $('pdfCardColor').value,
      pdfTextColor: $('pdfTextColor').value,
      promoBackgroundColor: $('promoBackgroundColor').value,
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
  $('deliveryFee').value = state.settings.deliveryFee || DEFAULT_SETTINGS.deliveryFee;
  $('titleFont').value = state.settings.titleFont || DEFAULT_SETTINGS.titleFont;
  $('bodyFont').value = state.settings.bodyFont || DEFAULT_SETTINGS.bodyFont;
  $('priceFont').value = state.settings.priceFont || DEFAULT_SETTINGS.priceFont;
  $('primaryColor').value = state.settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
  $('secondaryColor').value = state.settings.secondaryColor || DEFAULT_SETTINGS.secondaryColor;
  $('backgroundColor').value = state.settings.backgroundColor || DEFAULT_SETTINGS.backgroundColor;
  $('accentColor').value = state.settings.accentColor || DEFAULT_SETTINGS.accentColor;
  $('pdfPageColor').value = state.settings.pdfPageColor || DEFAULT_SETTINGS.pdfPageColor;
  $('pdfCardColor').value = state.settings.pdfCardColor || DEFAULT_SETTINGS.pdfCardColor;
  $('pdfTextColor').value = state.settings.pdfTextColor || DEFAULT_SETTINGS.pdfTextColor;
  $('promoBackgroundColor').value = state.settings.promoBackgroundColor || DEFAULT_SETTINGS.promoBackgroundColor;
  $('promoFooter').value = state.settings.promoFooter || DEFAULT_SETTINGS.promoFooter;
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

function mixHex(a, b, amount = 0.5) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  const mix = ar.map((value, index) => Math.round(value * (1 - amount) + br[index] * amount));
  return '#' + mix.map((value) => value.toString(16).padStart(2, '0')).join('');
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
  const pageColor = normalizeHex(state.settings.pdfPageColor, DEFAULT_SETTINGS.pdfPageColor);
  return colorIsWhite(pageColor) ? normalizeHex(state.settings.backgroundColor, DEFAULT_SETTINGS.backgroundColor) : pageColor;
}

function readableOnColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#263026' : '#ffffff';
}

function addImageContained(pdf, image, x, y, w, h, alias) {
  if (!image?.dataUrl || !image.width || !image.height) return false;
  const scale = Math.min(w / image.width, h / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const dx = x + (w - drawW) / 2;
  const dy = y + (h - drawH) / 2;
  pdf.addImage(image.dataUrl, imageType(image.dataUrl), dx, dy, drawW, drawH, alias, 'FAST');
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

  return { dataUrl, width, height };
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

    drawCover(pdf, { coverImage, logoImage, iconImage, whatsappIcon, deliveryIcon, locationIcon });

    const layout = {
      cols: 3,
      left: 8,
      top: 12,
      gapX: 3.5,
      gapY: 3.6,
      cardW: 62,
      cardH: 55,
      categoryH: 10,
      bottom: state.settings.showPromoFooter ? 266 : 288
    };

    let col = 0;
    let y = layout.top;
    let hasContentOnPage = false;

    const drawInternalPage = () => {
      drawInternalBackground(pdf);
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
        for (let emptyCol = fromCol; emptyCol < layout.cols; emptyCol += 1) {
          const x = layout.left + emptyCol * (layout.cardW + layout.gapX);
          drawEmptyProductDecoration(pdf, x, y, layout.cardW, layout.cardH);
        }
        y += layout.cardH + layout.gapY;
        col = 0;
      }
    };

    const ensureSpace = (heightNeeded) => {
      if (y + heightNeeded <= layout.bottom) return;
      drawPageRemainderDecoration(pdf, y, layout.bottom);
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
      drawCategoryTitle(pdf, group.category.nome, layout.left, y, 194);
      y += layout.categoryH;
      hasContentOnPage = true;

      for (const product of group.products) {
        if (col === 0) ensureSpace(layout.cardH);
        if (y + layout.cardH > layout.bottom) {
          drawPageRemainderDecoration(pdf, y, layout.bottom);
          addInternalPage();
          drawCategoryTitle(pdf, group.category.nome, layout.left, y, 194);
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

    if (hasContentOnPage) drawPageRemainderDecoration(pdf, y, layout.bottom);
    drawPromoFooter(pdf, promoImage);
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
  return String(dataUrl).toLowerCase().startsWith('data:image/png') ? 'PNG' : 'JPEG';
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

function drawCover(pdf, { coverImage, logoImage, iconImage, whatsappIcon, deliveryIcon, locationIcon }) {
  const w = 210, h = 297;
  const primary = normalizeHex(state.settings.primaryColor, DEFAULT_SETTINGS.primaryColor);
  const accent = normalizeHex(state.settings.accentColor, DEFAULT_SETTINGS.accentColor);
  const coverBg = normalizeHex(state.settings.backgroundColor, DEFAULT_SETTINGS.backgroundColor);
  const cream = normalizeHex(state.settings.pdfCardColor, '#fffaf1');
  const softAccent = mixHex(accent, coverBg, 0.76);
  const softPrimary = mixHex(primary, coverBg, 0.82);

  setFillHex(pdf, coverBg);
  pdf.rect(0, 0, w, h, 'F');

  // Fundo decorativo sutil, inspirado em catálogo floral, sem copiar referência.
  setFillHex(pdf, softPrimary);
  pdf.circle(18, 18, 34, 'F');
  pdf.circle(196, 286, 42, 'F');
  setDrawHex(pdf, softAccent);
  pdf.setLineWidth(0.35);
  for (let i = 0; i < 5; i += 1) {
    const x = 14 + i * 10;
    pdf.line(x, 247 + i * 4, x + 20, 226 + i * 2);
    pdf.circle(x + 11, 237 + i * 2.5, 1.1, 'S');
  }
  for (let i = 0; i < 5; i += 1) {
    const x = 184 - i * 10;
    pdf.line(x, 36 + i * 3, x - 18, 23 + i * 2);
    pdf.circle(x - 8, 30 + i * 2.5, 1.1, 'S');
  }

  setFillHex(pdf, cream);
  pdf.roundedRect(16, 16, 178, 265, 7, 7, 'F');
  setDrawHex(pdf, softAccent);
  pdf.setLineWidth(0.35);
  pdf.roundedRect(20, 20, 170, 257, 5, 5, 'S');

  if (logoImage) {
    addImageContained(pdf, logoImage, 30, 24, 44, 32, 'logo-capa');
  } else if (iconImage) {
    addImageContained(pdf, iconImage, 38, 27, 24, 24, 'icone-capa');
  } else {
    drawSimpleFlower(pdf, 52, 39, 1.05, primary, accent);
  }

  setPdfFont(pdf, 'title', 'bold');
  pdf.setFontSize(35);
  setTextHex(pdf, primary);
  pdf.text('CATÁLOGO', 181, 42, { align: 'right', maxWidth: 105 });
  pdf.setFontSize(23);
  setTextHex(pdf, accent);
  pdf.text('DE FLORES', 181, 58, { align: 'right', maxWidth: 105 });

  const business = String(state.settings.businessName || '').trim();
  if (business) {
    setPdfFont(pdf, 'title', 'bolditalic');
    pdf.setFontSize(22);
    setTextHex(pdf, primary);
    pdf.text(business, 105, 83, { align: 'center', maxWidth: 158 });
  }

  if (coverImage) {
    setFillHex(pdf, '#ffffff');
    pdf.roundedRect(28, 94, 154, 100, 5, 5, 'F');
    setDrawHex(pdf, softAccent);
    pdf.setLineWidth(0.35);
    pdf.roundedRect(28, 94, 154, 100, 5, 5, 'S');
    addImageContained(pdf, coverImage, 32, 98, 146, 92, 'foto-capa');
  } else {
    setFillHex(pdf, '#ffffff');
    pdf.roundedRect(38, 100, 134, 86, 5, 5, 'F');
    drawSimpleFlower(pdf, 105, 143, 3, primary, accent);
  }

  const subtitle = String(state.settings.catalogSubtitle || '').trim();
  if (subtitle) {
    setPdfFont(pdf, 'body', 'italic');
    pdf.setFontSize(14.5);
    setTextHex(pdf, primary);
    pdf.text(subtitle, 105, 211, { align: 'center', maxWidth: 155, lineHeightFactor: 1.15 });
  }

  const phone = String(state.settings.businessPhone || '').trim();
  const address = String(state.settings.businessAddress || '').trim();
  const deliveryFee = formatDeliveryFee(state.settings.deliveryFee || DEFAULT_SETTINGS.deliveryFee);
  const items = [
    { label: 'WHATSAPP', value: phone || 'Consulte pelo WhatsApp', icon: whatsappIcon },
    { label: 'ENTREGA', value: deliveryFee ? `Taxa ${deliveryFee}` : 'Taxa de entrega', icon: deliveryIcon },
    { label: 'LOCAL', value: address || 'Endereço da floricultura', icon: locationIcon }
  ];

  const itemW = 54;
  items.forEach((item, index) => {
    const x = 25 + index * (itemW + 4);
    setFillHex(pdf, '#ffffff');
    pdf.roundedRect(x, 231, itemW, 31, 5, 5, 'F');
    setDrawHex(pdf, softAccent);
    pdf.setLineWidth(0.28);
    pdf.roundedRect(x, 231, itemW, 31, 5, 5, 'S');
    if (item.icon) {
      addImageContained(pdf, item.icon, x + 4, 239, 12, 12, `cover-icon-${index}`);
    } else {
      setFillHex(pdf, mixHex(accent, '#ffffff', 0.2));
      pdf.circle(x + 10, 245, 6, 'F');
      setPdfFont(pdf, 'body', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(index === 0 ? 'W' : index === 1 ? 'E' : 'L', x + 10, 248, { align: 'center' });
    }
    setPdfFont(pdf, 'body', 'bold');
    pdf.setFontSize(8.2);
    setTextHex(pdf, primary);
    pdf.text(item.label, x + 19, 240, { maxWidth: 31 });
    setPdfFont(pdf, 'body', 'normal');
    pdf.setFontSize(7.2);
    setTextHex(pdf, '#4d554c');
    pdf.text(splitLines(pdf, item.value, 31, 2), x + 19, 247, { maxWidth: 31, lineHeightFactor: 1.05 });
  });
}

function drawInternalBackground(pdf) {
  const bg = internalPageColor();
  const accent = normalizeHex(state.settings.accentColor, DEFAULT_SETTINGS.accentColor);
  const primary = normalizeHex(state.settings.primaryColor, DEFAULT_SETTINGS.primaryColor);
  const softAccent = mixHex(accent, bg, 0.86);
  const softPrimary = mixHex(primary, bg, 0.9);

  setFillHex(pdf, bg);
  pdf.rect(0, 0, 210, 297, 'F');

  // Decoração sutil de fundo, sem moldura envolvendo todos os produtos.
  setDrawHex(pdf, softAccent);
  pdf.setLineWidth(0.22);
  for (let i = 0; i < 6; i += 1) {
    pdf.line(7 + i * 5, 28 + i * 5, 26 + i * 6, 12 + i * 3);
    pdf.circle(18 + i * 5, 21 + i * 3, 1.1, 'S');
  }
  setFillHex(pdf, softPrimary);
  pdf.circle(198, 22, 12, 'F');
  pdf.circle(15, 249, 18, 'F');
}

function drawHeader() {
  // Sem cabeçalho nas páginas internas para economizar espaço e evitar textos repetidos.
}

function drawCategoryTitle(pdf, title, x, y, width) {
  const primary = normalizeHex(state.settings.primaryColor, DEFAULT_SETTINGS.primaryColor);
  const accent = normalizeHex(state.settings.accentColor, DEFAULT_SETTINGS.accentColor);
  const bg = internalPageColor();
  const softAccent = mixHex(accent, bg, 0.7);

  setPdfFont(pdf, 'title', 'bold');
  pdf.setFontSize(13.4);
  setTextHex(pdf, primary);
  pdf.text(String(title || 'Produtos'), x, y + 5.5, { maxWidth: width - 24 });

  setDrawHex(pdf, softAccent);
  pdf.setLineWidth(0.35);
  pdf.line(x, y + 8.2, x + width, y + 8.2);

  setFillHex(pdf, accent);
  pdf.circle(x + width - 4, y + 7.9, 1.1, 'F');
  setDrawHex(pdf, softAccent);
  pdf.line(x + width - 18, y + 7.9, x + width - 7, y + 7.9);
}

function drawEmptyProductDecoration(pdf, x, y, w, h) {
  const bg = internalPageColor();
  const accent = mixHex(normalizeHex(state.settings.accentColor, DEFAULT_SETTINGS.accentColor), bg, 0.75);
  const primary = mixHex(normalizeHex(state.settings.primaryColor, DEFAULT_SETTINGS.primaryColor), bg, 0.82);

  setDrawHex(pdf, accent);
  pdf.setLineWidth(0.24);
  pdf.roundedRect(x + 2, y + 3, w - 4, h - 6, 4, 4, 'S');
  for (let i = 0; i < 4; i += 1) {
    const bx = x + 14 + i * 9;
    const by = y + h - 13 - i * 3;
    pdf.line(bx, by, bx + 9, by - 11);
    pdf.circle(bx + 6, by - 8, 1.15, 'S');
  }
  drawSimpleFlower(pdf, x + w - 14, y + 15, 0.38, primary, accent);
}

function drawPageRemainderDecoration(pdf, y, bottom) {
  if (bottom - y < 18) return;
  const bg = internalPageColor();
  const accent = mixHex(normalizeHex(state.settings.accentColor, DEFAULT_SETTINGS.accentColor), bg, 0.82);
  const primary = mixHex(normalizeHex(state.settings.primaryColor, DEFAULT_SETTINGS.primaryColor), bg, 0.88);
  const midY = y + Math.min(26, (bottom - y) / 2);

  setDrawHex(pdf, accent);
  pdf.setLineWidth(0.2);
  pdf.line(70, midY, 140, midY);
  pdf.circle(105, midY, 1.2, 'S');
  drawSimpleFlower(pdf, 61, midY, 0.35, primary, accent);
  drawSimpleFlower(pdf, 149, midY, 0.35, primary, accent);
}

function drawProductCard(pdf, product, x, y, w, h, image) {
  const cardColor = normalizeHex(state.settings.pdfCardColor, '#fffaf1');
  const accent = normalizeHex(state.settings.accentColor, DEFAULT_SETTINGS.accentColor);
  const textColor = normalizeHex(state.settings.pdfTextColor, DEFAULT_SETTINGS.pdfTextColor);
  const bg = internalPageColor();
  const softBorder = mixHex(accent, bg, 0.5);

  setFillHex(pdf, cardColor);
  setDrawHex(pdf, softBorder);
  pdf.setLineWidth(0.32);
  pdf.roundedRect(x, y, w, h, 4, 4, 'FD');

  const padding = 3.2;
  const imageW = 26;
  const imageH = h - 8;
  const imageX = x + w - imageW - padding;
  const imageY = y + 4;
  const textX = x + padding;
  const textW = imageX - textX - 2.4;

  if (image) {
    addImageContained(pdf, image, imageX, imageY, imageW, imageH, `produto-${product.id}`);
  } else {
    drawSimpleFlower(pdf, imageX + imageW / 2, imageY + imageH / 2, 0.55, state.settings.primaryColor, state.settings.secondaryColor);
  }

  setTextHex(pdf, textColor);
  setPdfFont(pdf, 'title', 'bold');
  pdf.setFontSize(9.2);
  const nameLines = splitLines(pdf, product.nome, textW, 3);
  pdf.text(nameLines, textX, y + 8.6, { lineHeightFactor: 1.02 });

  const descricao = String(product.descricao || '').trim();
  if (descricao) {
    setTextHex(pdf, textColor);
    setPdfFont(pdf, 'body', 'normal');
    pdf.setFontSize(6.25);
    const descLines = splitLines(pdf, descricao, textW, 2);
    pdf.text(descLines, textX, y + 25.2, { lineHeightFactor: 1.08 });
  }

  setDrawHex(pdf, accent);
  pdf.setLineWidth(0.22);
  pdf.line(textX, y + h - 16.5, textX + Math.min(25, textW), y + h - 16.5);

  setTextHex(pdf, accent);
  setPdfFont(pdf, 'price', 'bold');
  pdf.setFontSize(10.7);
  pdf.text(formatCurrency(product.preco), textX, y + h - 6.4, { maxWidth: textW });
}

function drawPromoFooter(pdf, promoImage) {
  if (!state.settings.showPromoFooter) return;
  const y = 270;
  const h = 27;
  const bg = normalizeHex(state.settings.promoBackgroundColor || state.settings.primaryColor, DEFAULT_SETTINGS.primaryColor);
  const accent = normalizeHex(state.settings.accentColor, DEFAULT_SETTINGS.accentColor);
  setFillHex(pdf, bg);
  pdf.rect(0, y, 210, h, 'F');
  setDrawHex(pdf, accent);
  pdf.setLineWidth(0.35);
  pdf.line(10, y + 1.5, 200, y + 1.5);

  setPdfFont(pdf, 'title', 'bold');
  pdf.setFontSize(12.7);
  pdf.setTextColor(255, 255, 255);
  const lines = String(state.settings.promoFooter || DEFAULT_SETTINGS.promoFooter).split('\n').slice(0, 2);
  pdf.text(lines, 18, y + 10, { maxWidth: 123, lineHeightFactor: 1.12 });

  if (promoImage) {
    addImageContained(pdf, promoImage, 148, y + 1.5, 48, 24, 'rodape-promo');
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

bindNavigation();
bindAuth();
bindProductUi();
bindCategoryUi();
bindAssetsUi();
bindSettingsUi();
bindPdfUi();
setThemeVariables();
registerServiceWorker();
