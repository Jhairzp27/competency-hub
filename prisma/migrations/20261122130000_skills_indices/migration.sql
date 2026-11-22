-- Extensión de trigramas: permite indexar búsquedas parciales (ILIKE '%texto%')
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "skills_nombre_trgm_idx" ON "skills" USING GIN ("nombre" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "skills_categoria_importancia_idx" ON "skills"("categoria", "importancia");
