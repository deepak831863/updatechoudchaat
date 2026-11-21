-- CloudChat: profiles, conversations, messages, hides, typing.

create table if not exists cc_profiles (
  user_id text primary key,
  display_name text not null,
  email text,
  image_url text,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists cc_conversations (
  id text primary key,
  low_id text not null,
  high_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (low_id, high_id)
);

create index if not exists cc_conversations_low_idx on cc_conversations (low_id);
create index if not exists cc_conversations_high_idx on cc_conversations (high_id);

create table if not exists cc_messages (
  id text primary key,
  conversation_id text not null references cc_conversations (id) on delete cascade,
  sender_id text not null,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read')),
  deleted_everyone boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists cc_messages_conv_idx on cc_messages (conversation_id, created_at);

create table if not exists cc_hides (
  message_id text not null,
  user_id text not null,
  primary key (message_id, user_id)
);

create table if not exists cc_typing (
  conversation_id text not null,
  user_id text not null,
  until_at timestamptz not null,
  primary key (conversation_id, user_id)
);
