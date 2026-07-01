# Auxiliar de Criação de Catálogos - Supabase

Programa web/PWA para cadastrar produtos de floricultura e gerar um catálogo em PDF.

## O que ele faz

- Cadastra, altera e exclui produtos.
- Salva imagem, preço, descrição, categoria e disponibilidade.
- Permite marcar produtos como disponíveis ou indisponíveis.
- Oculta produtos indisponíveis no PDF final.
- Cria, altera, exclui e ordena categorias.
- Cadastra imagens fixas: logotipo, foto da capa e ícone decorativo.
- Permite escolher cores e opções visuais do PDF.
- Gera PDF com capa, produtos por categoria, imagens, preços e rodapé promocional.

## Arquitetura

- Interface: HTML, CSS e JavaScript.
- Hospedagem: GitHub Pages.
- Login: Supabase Auth.
- Banco de dados: Supabase Postgres.
- Imagens: Supabase Storage.
- PDF: jsPDF no navegador.

## Senha

O app usa Supabase Auth. Fale com o João para pegar a senha

Usuário padrão sugerido:

```txt
E-mail: catalogo@bouquetflores.local
Senha: senha
```

Se usar outro e-mail, altere `ADMIN_EMAIL` no arquivo `supabase-config.js`.

## Observação sobre imagens

O bucket `catalogo-imagens` é público para leitura para que o PDF consiga carregar as fotos. Só usuários logados conseguem enviar, alterar ou excluir imagens.

## Android no futuro

Como o projeto é web/PWA, pode futuramente virar app Android usando Capacitor ou TWA, sem trocar o banco de dados.
