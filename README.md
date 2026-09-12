# Prontuário — Dr. Thiago Casagrande

Primeira versão funcional: login + lista/cadastro de pacientes, conectado ao Supabase.

## Como colocar no ar (sem precisar programar)

1. **Suba este código para o GitHub**: crie um repositório novo em github.com,
   e em "Add file > Upload files" arraste todos os arquivos/pastas deste projeto
   (mantendo a estrutura de pastas).

2. **Conecte no Vercel**: em vercel.com, clique em "Add New Project", escolha
   o repositório que você acabou de criar e clique em Import.

3. **Configure as variáveis de ambiente no Vercel** (tela de configuração do
   projeto, antes de clicar em Deploy):
   - `NEXT_PUBLIC_SUPABASE_URL` → a Project URL do seu Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → a chave "anon / public" do seu Supabase
     (Project Settings > API — **não** é a secret key)

4. Clique em **Deploy**. Em alguns minutos o Vercel te dá um link
   (algo como `prontuario-app.vercel.app`) já no ar.

5. Acesse esse link e entre com o e-mail/senha que você criou em
   Authentication > Users no Supabase.

## Rodando no seu computador (opcional, antes de publicar)

Se quiser testar no seu próprio computador antes de publicar:
```
npm install
cp .env.local.example .env.local   # depois edite .env.local com seus dados
npm run dev
```
Acesse http://localhost:3000
