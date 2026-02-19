-- ============================================================
-- FaB Map セキュリティ強化スクリプト
-- ============================================================

-- 1. 管理者テーブルの作成
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade
);

-- 2. 管理者判定関数の作成
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from admin_users
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 3. 既存の危険なポリシーを削除
drop policy if exists "Allow update access" on stores;
drop policy if exists "Allow delete access" on stores;
drop policy if exists "Allow read all stores" on stores;

drop policy if exists "Allow read all comments" on comments;
drop policy if exists "Allow update comments" on comments;
drop policy if exists "Allow delete comments" on comments;

-- 4. 新しい安全なポリシーを作成（管理者のみ許可）

-- storesテーブル
create policy "Allow admin update access"
on stores for update
using (is_admin())
with check (is_admin());

create policy "Allow admin delete access"
on stores for delete
using (is_admin());

create policy "Allow admin read all stores"
on stores for select
using (is_admin());

-- commentsテーブル
create policy "Allow admin read all comments"
on comments for select
using (is_admin());

create policy "Allow admin update comments"
on comments for update
using (is_admin())
with check (is_admin());

create policy "Allow admin delete comments"
on comments for delete
using (is_admin());

-- 5. あなたを管理者に設定
-- ⚠️ 下の 'あなたのUID' を、SupabaseのAuthentication > UsersからコピーしたUIDに書き換えて実行してください！！！
-- insert into admin_users (id) values ('あなたのUID');
