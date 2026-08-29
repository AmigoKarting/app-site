-- Le trigger de création de profil référençait encore le rôle 'employee',
-- supprimé de l'enum app_role (renommé gerant puis superviseur). Toute
-- inscription échouait avec "Database error creating new user".
-- Nouveau défaut : 'caissiere' (rôle le moins privilégié) ; le premier
-- utilisateur reste promu 'dev' automatiquement.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  no_dev_yet boolean;
begin
  select not exists (select 1 from public.profiles where role = 'dev')
  into no_dev_yet;

  insert into public.profiles (id, role, first_name, last_name, phone, phone_last4, email)
  values (
    new.id,
    case when no_dev_yet then 'dev'::public.app_role else 'caissiere'::public.app_role end,
    coalesce(new.raw_user_meta_data->>'first_name', null),
    coalesce(new.raw_user_meta_data->>'last_name', null),
    coalesce(new.raw_user_meta_data->>'phone', null),
    coalesce(new.raw_user_meta_data->>'phone_last4', null),
    new.email
  )
  on conflict (id) do update set
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name  = coalesce(excluded.last_name, profiles.last_name),
    phone      = coalesce(excluded.phone, profiles.phone),
    phone_last4= coalesce(excluded.phone_last4, profiles.phone_last4),
    email      = coalesce(excluded.email, profiles.email);
  return new;
end;
$function$;
