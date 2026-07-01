import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseConfig, ADMIN_EMAIL } from './supabase-config.js';

const STORAGE_BUCKET = 'catalogo-imagens';
const DATA_FILE = './migration/importacao-catalogo.json';

const $ = (id) => document.getElementById(id);
let supabase;

function log(message) {
  const box = $('importLog');
  const line = `[${new Date().toLocaleTimeString('pt-BR')}] ${message}`;
  box.textContent = box.textContent === 'Aguardando início da importação...' ? line : `${box.textContent}\n${line}`;
  box.scrollTop = box.scrollHeight;
}

function setResult(message, ok = true) {
  $('importResult').innerHTML = `<div class="${ok ? 'success-box' : 'warning-box'}">${message}</div>`;
}

function validateConfig() {
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey ||
      supabaseConfig.url.includes('COLE_AQUI') || supabaseConfig.anonKey.includes('COLE_AQUI')) {
    throw new Error('Edite o arquivo supabase-config.js antes de importar.');
  }
}

function base64ToBlob(base64, mime) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime || 'application/octet-stream' });
}

function publicUrl(path) {
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

async function uploadImage(image, label) {
  if (!image?.base64 || !image?.path) return { url: '', path: '' };
  const blob = base64ToBlob(image.base64, image.mime);
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(image.path, blob, { contentType: image.mime, upsert: true });
  if (error) throw new Error(`Erro ao enviar imagem de ${label}: ${error.message}`);
  return { url: publicUrl(image.path), path: image.path };
}

async function clearCurrentData() {
  log('Limpando dados atuais...');
  let error;

  ({ error } = await supabase.from('produtos').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  if (error) throw new Error(`Erro ao limpar produtos: ${error.message}`);

  ({ error } = await supabase.from('categorias').delete().neq('id', '00000000-0000-0000-0000-000000000000'));
  if (error) throw new Error(`Erro ao limpar categorias: ${error.message}`);

  ({ error } = await supabase.from('configuracoes').delete().in('id', ['visual', 'assets']));
  if (error) throw new Error(`Erro ao limpar configurações: ${error.message}`);
}

async function importCatalog() {
  $('startImportBtn').disabled = true;
  $('importLog').textContent = '';
  $('importResult').innerHTML = '';

  try {
    validateConfig();
    supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

    const password = $('importPassword').value;
    if (!password) throw new Error('Digite a senha do usuário administrador.');

    log(`Entrando como ${ADMIN_EMAIL}...`);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password
    });
    if (loginError) throw new Error(`Login falhou: ${loginError.message}`);

    log('Carregando arquivo de importação...');
    const response = await fetch(DATA_FILE);
    if (!response.ok) throw new Error('Não consegui carregar migration/importacao-catalogo.json.');
    const data = await response.json();

    log(`Base encontrada: ${data.summary.categories} categorias, ${data.summary.products} produtos e ${data.summary.fixedImages} imagens fixas.`);

    if ($('clearBeforeImport').checked) {
      await clearCurrentData();
    }

    log('Importando categorias...');
    const categoriesPayload = data.categories.map((c) => ({
      id: c.id,
      nome: c.nome,
      ordem: c.ordem,
      atualizado_em: new Date().toISOString()
    }));
    let result = await supabase.from('categorias').upsert(categoriesPayload, { onConflict: 'id' });
    if (result.error) throw new Error(`Erro ao importar categorias: ${result.error.message}`);

    log('Enviando imagens fixas...');
    const fixedUrls = {};
    for (const fixed of data.fixedImages) {
      const uploaded = await uploadImage(fixed.image, fixed.nome);
      fixedUrls[fixed.nome] = uploaded;
      log(`Imagem fixa enviada: ${fixed.nome}`);
    }

    const logo = fixedUrls[data.assetNameMap.logo] || { url: '', path: '' };
    const cover = fixedUrls[data.assetNameMap.cover] || { url: '', path: '' };
    const icon = fixedUrls[data.assetNameMap.icon] || { url: '', path: '' };

    const assetsPayload = {
      logoUrl: logo.url,
      logoPath: logo.path,
      coverUrl: cover.url,
      coverPath: cover.path,
      iconUrl: icon.url,
      iconPath: icon.path,
      importedFixedImages: fixedUrls
    };

    log('Salvando configurações visuais...');
    result = await supabase.from('configuracoes').upsert([
      { id: 'visual', dados: data.settings, atualizado_em: new Date().toISOString() },
      { id: 'assets', dados: assetsPayload, atualizado_em: new Date().toISOString() }
    ], { onConflict: 'id' });
    if (result.error) throw new Error(`Erro ao salvar configurações: ${result.error.message}`);

    log('Enviando imagens dos produtos e importando produtos...');
    const productsPayload = [];
    let index = 0;
    for (const product of data.products) {
      index += 1;
      const uploaded = await uploadImage(product.image, product.nome);
      productsPayload.push({
        id: product.id,
        nome: product.nome,
        preco: product.preco,
        descricao: product.descricao,
        categoria_id: product.categoria_id,
        disponivel: product.disponivel,
        imagem_url: uploaded.url,
        imagem_path: uploaded.path,
        atualizado_em: new Date().toISOString()
      });
      log(`${index}/${data.products.length} produto preparado: ${product.nome}`);
    }

    result = await supabase.from('produtos').upsert(productsPayload, { onConflict: 'id' });
    if (result.error) throw new Error(`Erro ao importar produtos: ${result.error.message}`);

    log('Importação concluída.');
    setResult('Importação concluída. Agora você pode voltar ao programa e conferir os produtos.', true);
  } catch (error) {
    console.error(error);
    log(`ERRO: ${error.message}`);
    setResult(`Erro na importação: ${error.message}`, false);
  } finally {
    $('startImportBtn').disabled = false;
  }
}

$('startImportBtn').addEventListener('click', importCatalog);
