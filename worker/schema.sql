-- MedConduta — schema do banco D1 (Fase 1: backend + autenticação)
--
-- `records` é um armazenamento genérico chave-valor por usuário, que espelha
-- exatamente os "stores" que já existiam no IndexedDB do navegador (srs,
-- prefs, progresso, respostas, ia_temas, ia_flashcards, ia_questoes) — a
-- Fase 2 é que vai desenhar um modelo relacional mais rico (cronograma,
-- tentativas de questão com tempo/banca, metadados de prioridade dos temas).
-- Por ora o objetivo é só trocar "onde o dado mora" (do navegador para o
-- servidor), sem mudar o formato do dado.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS records (
  user_id TEXT NOT NULL REFERENCES users(id),
  store TEXT NOT NULL,
  record_id TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, store, record_id)
);
