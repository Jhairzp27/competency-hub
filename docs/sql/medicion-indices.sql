-- Medición del efecto de los índices de búsqueda en la tabla skills.
-- Todo corre dentro de una transacción que termina en ROLLBACK:
-- no deja datos sintéticos ni elimina índices de forma permanente.
--
-- Ejecutar:
--   docker exec -i skillbridge_db psql -U admin -d skillbridge < docs/sql/medicion-indices.sql

BEGIN;

-- 1) Volumen de prueba: 100 000 skills sintéticas (cumplen todas las restricciones)
INSERT INTO skills (nombre, categoria, nivel_esperado, importancia, descripcion, updated_at)
SELECT
  'Skill sintetica ' || lpad(g::text, 6, '0'),
  (ARRAY['TECNICA','CONDUCTUAL'])[1 + (g / 7) % 2]::categoria_skill,
  1 + g % 5,
  (ARRAY['BAJA','MEDIA','ALTA','CRITICA'])[1 + g % 4]::importancia_skill,
  'Descripcion de prueba para medir el rendimiento numero ' || g,
  now()
FROM generate_series(1, 100000) AS g;

ANALYZE skills;

-- 2) CON índices
\echo '=== CON INDICES: busqueda parcial por nombre ==='
EXPLAIN (ANALYZE, BUFFERS) SELECT id, nombre FROM skills WHERE nombre ILIKE '%04242%' ORDER BY nombre LIMIT 10;
\echo '=== CON INDICES: solo filtro categoria + importancia (total para paginar) ==='
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM skills WHERE categoria = 'CONDUCTUAL' AND importancia = 'BAJA';
\echo '=== CON INDICES: filtro categoria + importancia + busqueda ==='
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM skills WHERE categoria = 'TECNICA' AND importancia = 'CRITICA' AND nombre ILIKE '%0424%';

-- 3) SIN índices (se eliminan solo dentro de esta transacción)
DROP INDEX skills_nombre_trgm_idx;
DROP INDEX skills_categoria_importancia_idx;

\echo '=== SIN INDICES: busqueda parcial por nombre ==='
EXPLAIN (ANALYZE, BUFFERS) SELECT id, nombre FROM skills WHERE nombre ILIKE '%04242%' ORDER BY nombre LIMIT 10;
\echo '=== SIN INDICES: solo filtro categoria + importancia (total para paginar) ==='
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM skills WHERE categoria = 'CONDUCTUAL' AND importancia = 'BAJA';
\echo '=== SIN INDICES: filtro categoria + importancia + busqueda ==='
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*) FROM skills WHERE categoria = 'TECNICA' AND importancia = 'CRITICA' AND nombre ILIKE '%0424%';

ROLLBACK;

-- El ROLLBACK deja filas muertas; se limpian para no afectar mediciones siguientes.
VACUUM ANALYZE skills;
