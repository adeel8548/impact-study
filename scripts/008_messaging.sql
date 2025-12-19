-- Messaging and notifications schema
-- Conversations link one admin to one teacher; uniqueness enforced on the pair
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (admin_id, teacher_id)
);

-- Messages within a conversation; only participants may send/read
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint sender_in_conversation check (
    sender_id in (
      select admin_id from conversations where id = conversation_id
    ) or sender_id in (
      select teacher_id from conversations where id = conversation_id
    )
  )
);
create index if not exists messages_conversation_created_idx on messages(conversation_id, created_at desc);

-- Notification rows for chat or other system alerts
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  type text not null check (type in ('chat','system')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, is_read, created_at desc);

-- RLS
alter table conversations enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;

-- Conversations: admins see their own; teachers see their own
create policy if not exists "admin can view own conversations" on conversations
  for select using (
    auth.uid() = admin_id
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy if not exists "teacher can view own conversations" on conversations
  for select using (
    auth.uid() = teacher_id
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher')
  );

create policy if not exists "admin can create conversation" on conversations
  for insert with check (
    auth.uid() = admin_id
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    and exists (select 1 from profiles t where t.id = teacher_id and t.role = 'teacher')
  );

-- Messages: only conversation members read/insert/update
create policy if not exists "members can read messages" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.admin_id = auth.uid() or c.teacher_id = auth.uid())
    )
  );

create policy if not exists "members can insert messages" on messages
  for insert with check (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.admin_id = auth.uid() or c.teacher_id = auth.uid())
        and sender_id = auth.uid()
    )
  );

create policy if not exists "members can mark read" on messages
  for update using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.admin_id = auth.uid() or c.teacher_id = auth.uid())
    )
  ) with check (true);

-- Notifications: owner only
create policy if not exists "user can read notifications" on notifications
  for select using (user_id = auth.uid());

create policy if not exists "user can insert notifications" on notifications
  for insert with check (user_id = auth.uid());

create policy if not exists "user can update notifications" on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
