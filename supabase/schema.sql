-- stores テーブルの作成
-- 管理者テーブル（UIDのみ格納）
create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade
);

-- 管理者判定関数
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from admin_users
    where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- stores テーブルの作成
create table stores (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  prefecture text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  fab_available boolean default false,
  armory_available boolean default false,
  format_text text,
  notes text,
  source_type text default 'community', -- 'initial' or 'community'
  status text default 'pending', -- 'approved' or 'pending'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- インデックスの作成
create index idx_stores_prefecture on stores(prefecture);
create index idx_stores_status on stores(status);

-- 更新日時自動更新用の関数とトリガー
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_stores_updated_at
before update on stores
for each row
execute function update_updated_at_column();

-- 行レベルセキュリティ (RLS) の設定 (簡易版)
alter table stores enable row level security;

-- 全ユーザーが承認済みデータを読み取れるポリシー
create policy "Allow public read-only access for approved stores"
on stores for select
using (status = 'approved');

-- 認証なしで（誰でも）匿名投稿を許可するポリシー (statusはデフォルトでpending)
create policy "Allow anonymous submissions"
on stores for insert
with check (true);

-- ⚠️ 以下のポリシーはSupabaseダッシュボードのSQL Editorで手動実行が必要です
-- ※ git push しただけでは反映されません

-- 全ユーザーが全データを更新できるポリシー (廃止 -> 管理者のみ許可)
create policy "Allow admin update access"
on stores for update
using (is_admin())
with check (is_admin());

-- 全ユーザーが全データを削除できるポリシー (廃止 -> 管理者のみ許可)
create policy "Allow admin delete access"
on stores for delete
using (is_admin());

-- ⚠️ 既存のSELECTポリシーは承認済みデータのみを返します。
-- 管理画面でpendingデータを表示するには、以下のポリシーも追加が必要です:
-- 管理画面でpendingデータを表示するには、管理者のみ許可
create policy "Allow admin read all stores"
on stores for select
using (is_admin());

-- ============================================================
-- comments テーブル（ユーザーコメント機能）
-- ============================================================

-- ⚠️ 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください

create table comments (
  id uuid default gen_random_uuid() primary key,
  store_id uuid not null references stores(id) on delete cascade,
  commenter_name text default '匿名',
  content text not null,
  status text default 'pending', -- 'pending' or 'approved'
  submitter_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- インデックス
create index idx_comments_store_id on comments(store_id);
create index idx_comments_status on comments(status);

-- RLS
alter table comments enable row level security;

-- 承認済みコメントの読み取りを許可
create policy "Allow read approved comments"
on comments for select
using (status = 'approved');

-- 全コメントの読み取り（管理画面用 -> 管理者のみ）
create policy "Allow admin read all comments"
on comments for select
using (is_admin());

-- 誰でもコメント投稿可能
create policy "Allow insert comments"
on comments for insert
with check (true);

-- コメントの更新を許可（管理画面での承認用 -> 管理者のみ）
create policy "Allow admin update comments"
on comments for update
using (is_admin())
with check (is_admin());

-- コメントの削除を許可（管理者のみ）
-- ※自分のコメント削除機能を維持する場合は、submitter_id のチェックも必要だが、
--   現状はセキュリティ優先で管理者のみにする。
--   (ユーザーによる自己削除は後日対応: (submitter_id = current_setting('request.headers')::json->>'x-submitter-id') 等)
create policy "Allow admin delete comments"
on comments for delete
using (is_admin());
