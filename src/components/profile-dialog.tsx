import { useEffect, useMemo, useState } from "react";
import { Camera, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/mock-role";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const { user, refresh } = useAuth();
  const [nome, setNome] = useState(user.nome);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user.foto_url);
  const [savingProfile, setSavingProfile] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const initials = useMemo(
    () =>
      user.nome
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [user.nome],
  );

  useEffect(() => {
    if (!open) return;
    setNome(user.nome);
    setPhoto(null);
    setPreview(user.foto_url);
    setPassword("");
    setPasswordConfirmation("");
  }, [open, user.nome, user.foto_url]);

  useEffect(
    () => () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      toast.error("Use uma imagem JPG, PNG ou WEBP");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("A foto deve ter no máximo 2 MB");
      return;
    }
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    const trimmedName = nome.trim();
    if (trimmedName.length < 2) {
      toast.error("Informe um nome válido");
      return;
    }

    setSavingProfile(true);
    try {
      let avatarPath = user.avatar_path;

      if (photo) {
        const extension =
          photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
        const nextPath = `${user.id}/avatar.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(nextPath, photo, { upsert: true, contentType: photo.type });
        if (uploadError) throw uploadError;

        if (avatarPath && avatarPath !== nextPath) {
          await supabase.storage.from("avatars").remove([avatarPath]);
        }
        avatarPath = nextPath;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ nome: trimmedName, avatar_path: avatarPath } as never)
        .eq("id", user.id);
      if (error) throw error;

      await refresh();
      setPhoto(null);
      toast.success("Perfil atualizado");
    } catch (error) {
      toast.error("Não foi possível atualizar o perfil", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async () => {
    if (password.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error("As senhas não conferem");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setPasswordConfirmation("");
      toast.success("Senha atualizada com sucesso");
    } catch (error) {
      toast.error("Não foi possível atualizar a senha", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Meu perfil</DialogTitle>
          <DialogDescription>Atualize seus dados pessoais e sua senha de acesso.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border border-border">
              <AvatarImage src={preview ?? undefined} alt={`Foto de ${user.nome}`} />
              <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label
                htmlFor="profile-photo"
                className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <Camera className="mr-2 h-4 w-4" />
                Alterar foto
              </Label>
              <Input
                id="profile-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => choosePhoto(event.target.files?.[0])}
              />
              <p className="mt-2 text-xs text-muted-foreground">JPG, PNG ou WEBP. Máximo de 2 MB.</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-email">E-mail corporativo</Label>
            <Input id="profile-email" value={user.email} disabled />
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={savingProfile}
            onClick={() => void saveProfile()}
          >
            {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar perfil
          </Button>

          <Separator />

          <div>
            <h3 className="flex items-center text-sm font-semibold">
              <KeyRound className="mr-2 h-4 w-4" />
              Alterar senha
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use pelo menos 8 caracteres.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            disabled={savingPassword || !password || !passwordConfirmation}
            onClick={() => void updatePassword()}
          >
            {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Atualizar senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
