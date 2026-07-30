# Criação de planilhas no Google

O botão **Criar planilha no Google** usa o modelo de token do Google Identity
Services. A autorização acontece somente quando o usuário clica no botão. O
Controller CS não recebe nem armazena senha ou token de atualização do Google.

## Configuração necessária

1. No Google Cloud corporativo, habilitar a **Google Sheets API**.
2. Configurar a tela de consentimento OAuth como interna da organização.
3. Criar um Client ID OAuth do tipo **Aplicativo da Web**.
4. Cadastrar como origens JavaScript autorizadas:
   - a URL publicada da aplicação;
   - a URL de prévia usada nos testes.
5. Na Lovable, criar a variável pública `VITE_GOOGLE_CLIENT_ID` com o Client ID.
6. Publicar novamente a aplicação para a variável entrar no build.

## Permissão solicitada

A aplicação solicita apenas o escopo `drive.file`. Ele permite criar e alterar
arquivos que o próprio usuário autorizou a aplicação a criar, sem conceder
acesso geral ao restante do Google Drive.
