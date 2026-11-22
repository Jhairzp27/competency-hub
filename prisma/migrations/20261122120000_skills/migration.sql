-- CreateEnum
CREATE TYPE "categoria_skill" AS ENUM ('TECNICA', 'CONDUCTUAL');

-- CreateEnum
CREATE TYPE "importancia_skill" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "categoria" "categoria_skill" NOT NULL,
    "nivel_esperado" SMALLINT NOT NULL,
    "importancia" "importancia_skill" NOT NULL,
    "descripcion" VARCHAR(500) NOT NULL,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_nombre_key" ON "skills"("nombre");

-- CreateIndex
CREATE INDEX "skills_created_by_id_idx" ON "skills"("created_by_id");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Restricciones CHECK (Prisma no las genera; se añaden a mano como última defensa en la BD)
ALTER TABLE "skills"
  ADD CONSTRAINT "skills_nivel_esperado_rango" CHECK ("nivel_esperado" BETWEEN 1 AND 5),
  ADD CONSTRAINT "skills_nombre_longitud" CHECK (char_length(btrim("nombre")) BETWEEN 3 AND 80),
  ADD CONSTRAINT "skills_descripcion_longitud" CHECK (char_length(btrim("descripcion")) BETWEEN 10 AND 500);
