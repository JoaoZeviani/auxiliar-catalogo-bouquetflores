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

function normalizeAssets(raw = {}) {
  const assets = { ...DEFAULT_ASSETS, ...(raw || {}) };
  const importedPromo = assets.importedFixedImages?.['Imagem Chocolates e Pelúcias'];
  if (!assets.promoImageUrl && importedPromo?.url) assets.promoImageUrl = importedPromo.url;
  if (!assets.promoImagePath && importedPromo?.path) assets.promoImagePath = importedPromo.path;
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
    ['iconInput', 'iconUrl', 'iconPath', 'icone'],
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
  renderAssetPreview('logoPreview', state.assets.logoUrl, 'Nenhum logotipo');
  renderAssetPreview('coverPreview', state.assets.coverUrl, 'Nenhuma foto de capa');
  renderAssetPreview('iconPreview', state.assets.iconUrl, 'Nenhum ícone');
  renderAssetPreview('promoImagePreview', state.assets.promoImageUrl, 'Nenhuma imagem de rodapé');
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
      pdfPageColor: $('pdfPageColor').value,
      pdfCardColor: $('pdfCardColor').value,
      pdfCardBorderColor: $('pdfCardBorderColor').value,
      pdfTextColor: $('pdfTextColor').value,
      pdfMutedTextColor: $('pdfMutedTextColor').value,
      pdfPriceColor: $('pdfPriceColor').value,
      promoBackgroundColor: $('promoBackgroundColor').value,
      promoTextColor: $('promoTextColor').value,
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
  $('pdfPageColor').value = state.settings.pdfPageColor || DEFAULT_SETTINGS.pdfPageColor;
  $('pdfCardColor').value = state.settings.pdfCardColor || DEFAULT_SETTINGS.pdfCardColor;
  $('pdfCardBorderColor').value = state.settings.pdfCardBorderColor || DEFAULT_SETTINGS.pdfCardBorderColor;
  $('pdfTextColor').value = state.settings.pdfTextColor || DEFAULT_SETTINGS.pdfTextColor;
  $('pdfMutedTextColor').value = state.settings.pdfMutedTextColor || DEFAULT_SETTINGS.pdfMutedTextColor;
  $('pdfPriceColor').value = state.settings.pdfPriceColor || DEFAULT_SETTINGS.pdfPriceColor;
  $('promoBackgroundColor').value = state.settings.promoBackgroundColor || DEFAULT_SETTINGS.promoBackgroundColor;
  $('promoTextColor').value = state.settings.promoTextColor || DEFAULT_SETTINGS.promoTextColor;
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
    const orderedProducts = sortedCategories.flatMap((category) =>
      productPool
        .filter((p) => p.categoriaId === category.id)
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
    );

    const imageCache = new Map();
    const getImage = async (url, fitW, fitH) => {
      if (!url) return '';
      const key = `${url}|${fitW}|${fitH}`;
      if (imageCache.has(key)) return imageCache.get(key);
      try {
        const data = await imageUrlToDataUrl(url);
        const fitted = await fitImageToBox(data, fitW, fitH);
        imageCache.set(key, fitted);
        return fitted;
      } catch (error) {
        console.warn('Falha ao carregar imagem para PDF', error);
        return '';
      }
    };

    const coverImage = await getImage(state.assets.coverUrl, 1600, 1000);
    const logoImage = await getImage(state.assets.logoUrl, 700, 320);
    const iconImage = await getImage(state.assets.iconUrl, 300, 300);
    const promoImage = await getImage(state.assets.promoImageUrl, 520, 300);

    drawCover(pdf, { coverImage, logoImage, iconImage });

    const cardW = 91.5;
    const cardH = 80;
    const left = 11;
    const top = 12;
    const gapX = 5;
    const gapY = 5;
    const productsPerPage = 6;
    let slot = 0;

    const drawInternalPage = () => {
      drawInternalBackground(pdf);
      slot = 0;
    };

    const addInternalPage = () => {
      if (pdf.getNumberOfPages() > 1) drawPromoFooter(pdf, promoImage);
      pdf.addPage();
      drawInternalPage();
    };

    addInternalPage();

    if (!orderedProducts.length) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      setTextHex(pdf, state.settings.primaryColor);
      pdf.text('Nenhum produto disponível para o PDF.', 105, 130, { align: 'center' });
      drawPromoFooter(pdf, promoImage);
      pdf.save(pdfFileName());
      return;
    }

    for (const product of orderedProducts) {
      if (slot >= productsPerPage) addInternalPage();
      const col = slot % 2;
      const row = Math.floor(slot / 2);
      const x = left + col * (cardW + gapX);
      const y = top + row * (cardH + gapY);
      const productImage = await getImage(product.imagemUrl, 900, 560);
      drawProductCard(pdf, product, x, y, cardW, cardH, productImage);
      slot += 1;
    }

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

  setFillHex(pdf, '#ffffff');
  pdf.roundedRect(16, 18, 178, 261, 8, 8, 'F');
  setDrawHex(pdf, state.settings.secondaryColor);
  pdf.setLineWidth(0.45);
  pdf.roundedRect(20, 22, 170, 253, 6, 6, 'S');

  if (logoImage) {
    pdf.addImage(logoImage, imageType(logoImage), 74, 29, 62, 28, undefined, 'FAST');
  } else if (iconImage) {
    pdf.addImage(iconImage, imageType(iconImage), 91, 28, 28, 28, undefined, 'FAST');
  } else {
    drawSimpleFlower(pdf, 105, 42, 1.2, state.settings.primaryColor, state.settings.secondaryColor);
  }

  if (coverImage) {
    setFillHex(pdf, state.settings.pdfPageColor || '#ffffff');
    pdf.roundedRect(28, 66, 154, 96, 5, 5, 'F');
    setDrawHex(pdf, state.settings.pdfCardBorderColor || '#eadfd4');
    pdf.setLineWidth(0.35);
    pdf.roundedRect(28, 66, 154, 96, 5, 5, 'S');
    pdf.addImage(coverImage, imageType(coverImage), 31, 69, 148, 90, undefined, 'FAST');
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(36);
  setTextHex(pdf, state.settings.primaryColor);
  pdf.text('Catálogo', 105, coverImage ? 188 : 126, { align: 'center' });

  const business = String(state.settings.businessName || '').trim();
  if (business) {
    pdf.setFont('times', 'bolditalic');
    pdf.setFontSize(23);
    setTextHex(pdf, state.settings.accentColor);
    pdf.text(business, 105, coverImage ? 207 : 145, { align: 'center', maxWidth: 150 });
  }

  const subtitle = String(state.settings.catalogSubtitle || '').trim();
  if (subtitle) {
    pdf.setFont('times', 'italic');
    pdf.setFontSize(15);
    setTextHex(pdf, state.settings.pdfMutedTextColor || '#666d64');
    pdf.text(subtitle, 105, coverImage ? 222 : 160, { align: 'center', maxWidth: 138 });
  }

  const contact = [state.settings.businessPhone, state.settings.businessAddress].filter(Boolean).join('  •  ');
  if (contact) {
    setDrawHex(pdf, state.settings.secondaryColor);
    pdf.setLineWidth(0.35);
    pdf.line(50, 238, 160, 238);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    setTextHex(pdf, state.settings.pdfMutedTextColor || '#666d64');
    pdf.text(contact, 105, 249, { align: 'center', maxWidth: 145 });
  }
}

function drawInternalBackground(pdf) {
  setFillHex(pdf, state.settings.pdfPageColor || '#ffffff');
  pdf.rect(0, 0, 210, 297, 'F');
}

function drawHeader() {
  // Sem cabeçalho nas páginas internas para economizar espaço e evitar textos repetidos.
}

function drawCategoryTitle() {
  // As categorias continuam ordenando os produtos, mas não são impressas no PDF.
}

function drawProductCard(pdf, product, x, y, w, h, image) {
  setFillHex(pdf, state.settings.pdfCardColor || '#ffffff');
  setDrawHex(pdf, state.settings.pdfCardBorderColor || '#eadfd4');
  pdf.setLineWidth(0.28);
  pdf.roundedRect(x, y, w, h, 4, 4, 'FD');

  const imageX = x + 4;
  const imageY = y + 4;
  const imageW = w - 8;
  const imageH = 40;

  setFillHex(pdf, state.settings.pdfPageColor || '#ffffff');
  pdf.roundedRect(imageX, imageY, imageW, imageH, 3, 3, 'F');
  if (image) {
    pdf.addImage(image, imageType(image), imageX, imageY, imageW, imageH, undefined, 'FAST');
  } else {
    drawSimpleFlower(pdf, x + w / 2, y + 24, 0.9, state.settings.primaryColor, state.settings.secondaryColor);
  }

  setTextHex(pdf, state.settings.pdfTextColor || '#263026');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.6);
  const nameLines = splitLines(pdf, product.nome, w - 10, 2);
  pdf.text(nameLines, x + 5, y + 51);

  const descricao = String(product.descricao || '').trim();
  if (descricao) {
    setTextHex(pdf, state.settings.pdfMutedTextColor || '#666d64');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.4);
    const descLines = splitLines(pdf, descricao, w - 10, 2);
    pdf.text(descLines, x + 5, y + 62);
  }

  setFillHex(pdf, state.settings.pdfPriceColor || state.settings.accentColor);
  pdf.roundedRect(x + w - 43, y + h - 12, 38, 8.5, 4.2, 4.2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text(formatCurrency(product.preco), x + w - 24, y + h - 6.2, { align: 'center', maxWidth: 34 });
}

function drawPromoFooter(pdf, promoImage) {
  if (!state.settings.showPromoFooter) return;
  const y = 270;
  const h = 27;
  setFillHex(pdf, state.settings.promoBackgroundColor || state.settings.primaryColor);
  pdf.rect(0, y, 210, h, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11.5);
  setTextHex(pdf, state.settings.promoTextColor || '#ffffff');
  const lines = String(state.settings.promoFooter || DEFAULT_SETTINGS.promoFooter).split('\n').slice(0, 2);
  pdf.text(lines, 18, y + 10, { maxWidth: 120 });

  if (promoImage) {
    setFillHex(pdf, '#ffffff');
    pdf.roundedRect(151, y + 3.5, 42, 20, 3, 3, 'F');
    pdf.addImage(promoImage, imageType(promoImage), 153, y + 5, 38, 17, undefined, 'FAST');
  }
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
