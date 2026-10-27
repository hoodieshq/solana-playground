-- Erase what deleted conversations said.
--
-- Deleting a project tombstoned its conversations but left their messages and
-- titles in place, unreadable through every API yet kept forever.
-- `deleteProject` now erases them in its own transaction; this clears the
-- conversations tombstoned before it did. The rows stay: a push to one is
-- answered "deleted" because of them.

-- migrate:up

delete from messages m
 using conversations c
 where m.conversation_id = c.id
   and c.deleted_at is not null;

update conversations
   set title = null
 where deleted_at is not null
   and title is not null;

-- migrate:down

-- Nothing: erased content cannot be restored.
