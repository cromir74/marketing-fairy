CREATE TABLE IF NOT EXISTS public.calendar_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    recommendations JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 제약 조건 복합키 (user_id, year, month)
ALTER TABLE public.calendar_recommendations DROP CONSTRAINT IF EXISTS unique_user_month;
ALTER TABLE public.calendar_recommendations ADD CONSTRAINT unique_user_month UNIQUE (user_id, year, month);

-- RLS
ALTER TABLE public.calendar_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own recommendations" ON public.calendar_recommendations;
CREATE POLICY "Users can view their own recommendations" 
  ON public.calendar_recommendations FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recommendations" ON public.calendar_recommendations;
CREATE POLICY "Users can insert their own recommendations" 
  ON public.calendar_recommendations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recommendations" ON public.calendar_recommendations;
CREATE POLICY "Users can update their own recommendations" 
  ON public.calendar_recommendations FOR UPDATE 
  USING (auth.uid() = user_id);
