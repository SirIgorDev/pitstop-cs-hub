# Cargos e permissões — homologação e rollback

## O que a migration preserva

- A coluna legada `profiles.role` não é removida.
- Os quatro cargos atuais são criados e recebem as mesmas permissões atuais.
- Cada usuário recebe automaticamente o cargo equivalente ao seu perfil atual.
- Ao atribuir um cargo, `profiles.role` é sincronizado com o perfil de compatibilidade do cargo.

## Rollback operacional (recomendado)

Na tela **Administração > Cargos e permissões**, desligue **Nova matriz ativa**. A aplicação e as políticas RLS passam imediatamente a usar as regras antigas de `profiles.role`; não é necessário novo deploy.

Equivalente no SQL Editor do Supabase:

```sql
update public.access_control_settings
set rbac_enabled = false, updated_at = now()
where id = true;
```

Para retomar a homologação, ligue o controle na tela ou altere `rbac_enabled` para `true`.

## Roteiro mínimo de homologação

1. Conferir os cargos Administrador, Coordenador, Analista de CS e Analista de Processos.
2. Conferir se o Administrador está protegido e com todas as permissões.
3. Entrar com um usuário de cada cargo e validar menus, inclusão, edição, inativação, exportação e escopo próprio/todos.
4. Criar um cargo de teste baseado em Analista de CS, alterar duas permissões e atribuí-lo a um usuário de teste.
5. Desligar a nova matriz e confirmar que o usuário volta ao perfil de compatibilidade.
6. Religar a matriz e confirmar que as permissões personalizadas voltam imediatamente.

## Rollback estrutural

Durante a homologação, não remover tabelas nem a coluna `cargo_id`. O rollback operacional é suficiente e preserva os dados para diagnóstico. Uma migration de remoção só deve ser criada depois de decisão formal de abandonar o recurso.
