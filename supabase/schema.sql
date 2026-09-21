-- ==============================================================================
-- Life-OS (인생 Super App) Supabase PostgreSQL Schema & Security Policies (RLS)
-- ==============================================================================

-- 1. 필수 정보 테이블 (Quick-Copy)
CREATE TABLE IF NOT EXISTS public.essential_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'account', 'address', 'vehicle', 'id_number', 'insurance', 'custom'
  title VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  is_masked BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. 비밀번호 매니저 (Client-Side AES-256 Encrypted Zero-Knowledge Vault)
CREATE TABLE IF NOT EXISTS public.vault_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  site_name VARCHAR(100) NOT NULL,
  site_url TEXT,
  username VARCHAR(100),
  encrypted_password TEXT NOT NULL, -- Client-side AES-256 Encrypted Payload
  iv TEXT NOT NULL,                -- Base64 encoded Initialization Vector
  salt TEXT NOT NULL,              -- Base64 encoded Salt for key derivation
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. 일기 및 과거 기록 아카이브 (지독한 일기)
CREATE TABLE IF NOT EXISTS public.diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  entry_date DATE NOT NULL,
  mood VARCHAR(20),                -- 'great', 'good', 'neutral', 'bad', 'terrible'
  is_archived_from_past BOOLEAN DEFAULT false,
  source_type VARCHAR(50) DEFAULT 'direct', -- 'direct', 'google_docs', 'email', 'app'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- 루틴 체크리스트 및 스트릭 트래커
CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  frequency VARCHAR(20) DEFAULT 'daily', -- 'daily', 'weekdays', 'weekly'
  streak_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(routine_id, completed_date)
);

-- 4. 건강 & 1RM 운동 기록
CREATE TABLE IF NOT EXISTS public.health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC(5,2),             -- 체중 (kg)
  skeletal_muscle_mass NUMERIC(5,2), -- 골격근량 (kg)
  body_fat_ratio NUMERIC(4,2),     -- 체지방률 (%)
  systolic_bp INT,                 -- 수축기 혈압
  diastolic_bp INT,                -- 이완기 혈압
  logged_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_1rm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_name VARCHAR(50) NOT NULL, -- '스쿼트', '벤치프레스', '데드리프트', '오버헤드프레스' 등
  weight NUMERIC(6,2) NOT NULL,       -- 중량 (kg)
  reps INT NOT NULL,                  -- 반복 수
  calculated_1rm NUMERIC(6,2) NOT NULL, -- 공식: weight * (1 + reps / 30.0)
  logged_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. 가계부 (문자/알림 파싱)
CREATE TABLE IF NOT EXISTS public.financial_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(10) DEFAULT 'expense', -- 'expense', 'income', 'transfer'
  category VARCHAR(50) NOT NULL,      -- '식비', '교통', '쇼핑', '주거/통신', '금융', '기타'
  merchant_name VARCHAR(100),
  payment_method VARCHAR(50),         -- '신한카드', '현대카드', '카카오페이' 등
  raw_text TEXT,                      -- 원본 파싱 대상 SMS/카톡 텍스트
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==============================================================================
-- Row Level Security (RLS) Policies — 철저한 1인 데이터 격리
-- ==============================================================================

ALTER TABLE public.essential_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_1rm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_logs ENABLE ROW LEVEL SECURITY;

-- 1. essential_info RLS
CREATE POLICY "Users can manage own essential_info"
  ON public.essential_info
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. vault_passwords RLS
CREATE POLICY "Users can manage own vault_passwords"
  ON public.vault_passwords
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. diaries RLS
CREATE POLICY "Users can manage own diaries"
  ON public.diaries
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- routines & routine_logs RLS
CREATE POLICY "Users can manage own routines"
  ON public.routines
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own routine_logs"
  ON public.routine_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. health_logs & workout_1rm RLS
CREATE POLICY "Users can manage own health_logs"
  ON public.health_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own workout_1rm"
  ON public.workout_1rm
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. financial_logs RLS
CREATE POLICY "Users can manage own financial_logs"
  ON public.financial_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
