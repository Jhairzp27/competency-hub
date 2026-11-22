-- CreateTable
CREATE TABLE "chat_messages" (
    "id" SERIAL NOT NULL,
    "content" VARCHAR(500) NOT NULL,
    "room" VARCHAR(50) NOT NULL DEFAULT 'general',
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_room_created_at_idx" ON "chat_messages"("room", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_user_id_idx" ON "chat_messages"("user_id");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Restricciones CHECK (Prisma no las genera; se añaden a mano como última defensa en la BD)
ALTER TABLE "chat_messages"
  ADD CONSTRAINT "chat_messages_content_longitud" CHECK (char_length(btrim("content")) BETWEEN 1 AND 500),
  ADD CONSTRAINT "chat_messages_room_longitud" CHECK (char_length(btrim("room")) BETWEEN 1 AND 50);
