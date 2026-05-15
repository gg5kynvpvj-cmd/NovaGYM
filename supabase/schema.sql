-- ═══════════════════════════════════════════════════════════
-- NovaGYM — Schéma Supabase
-- Copie-colle ce SQL dans Supabase > SQL Editor > New Query
-- ═══════════════════════════════════════════════════════════

-- ─── TABLE PROFILES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT,
  age             INTEGER,
  weight          DECIMAL(5,1),
  height          DECIMAL(5,1),
  body_fat_pct    DECIMAL(4,1),
  gender          TEXT        DEFAULT 'male',
  diet_type       TEXT        DEFAULT 'standard',
  goal            TEXT        DEFAULT 'maintain',   -- bulk | maintain | cut
  level           TEXT        DEFAULT 'beginner',   -- beginner | advanced
  series_type     TEXT        DEFAULT 'fixed',      -- fixed | fixed_failure
  program_type    TEXT        DEFAULT 'ppl',        -- ppl | upper_lower | full_body | bro_split | home | gym | custom
  training_days   TEXT[]      DEFAULT '{}',         -- ['monday','wednesday','friday']
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE SESSIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  type        TEXT,                                   -- push | pull | legs | upper | lower | full_body | ...
  duration    INTEGER     DEFAULT 0,                  -- secondes
  completed   BOOLEAN     DEFAULT FALSE,
  volume      DECIMAL(8,1) DEFAULT 0,                -- kg total soulevés
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE SESSION_EXERCISES ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_exercises (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID    REFERENCES public.sessions(id) ON DELETE CASCADE,
  exercise_name   TEXT    NOT NULL,
  exercise_id     TEXT,
  is_unilateral   BOOLEAN DEFAULT FALSE,
  sets            JSONB   DEFAULT '[]',
  -- Format sets :
  -- [{"reps":12,"weight":20,"left_done":true,"right_done":true,"done":true}]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLE BADGES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,      -- '1_month' | '6_months' | '1_year' | 'first_session' | 'streak_4w' | 'streak_8w' | 'sessions_10' | 'sessions_50'
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, type)                 -- Pas de doublons de badges
);

-- ─── SÉCURITÉ (Row Level Security) ───────────────────────
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges             ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur ne voit que ses propres données
CREATE POLICY "users_own_profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "users_own_sessions" ON public.sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users_own_exercises" ON public.session_exercises
  FOR ALL USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );

CREATE POLICY "users_own_badges" ON public.badges
  FOR ALL USING (auth.uid() = user_id);

-- ─── INDEX POUR LES PERFORMANCES ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_user_date  ON public.sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_badges_user         ON public.badges(user_id);
CREATE INDEX IF NOT EXISTS idx_session_ex_session  ON public.session_exercises(session_id);

-- ─── TRIGGER: créer le profil automatiquement ─────────────
-- Ce trigger crée une entrée dans profiles dès qu'un user s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
