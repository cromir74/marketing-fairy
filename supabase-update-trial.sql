-- 무료체험 사용자 일일 발행 추적 테이블
CREATE TABLE IF NOT EXISTS public.daily_publish_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    date DATE NOT NULL,
    instagram_count INTEGER DEFAULT 0,
    threads_count INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.daily_publish_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily publish usage" 
    ON public.daily_publish_usage FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily publish usage" 
    ON public.daily_publish_usage FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily publish usage" 
    ON public.daily_publish_usage FOR UPDATE 
    USING (auth.uid() = user_id);
