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
