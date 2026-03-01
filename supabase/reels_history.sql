CREATE TABLE reels_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  store_id UUID REFERENCES stores(id),
  topic TEXT,
  style TEXT,
  slides JSONB,
  font TEXT,
  text_color TEXT,
  bgm_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  instagram_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 월별 사용량 체크용 인덱스
CREATE INDEX idx_reels_user_month ON reels_history (user_id, created_at);

-- RLS (Row Level Security) 설정
ALTER TABLE reels_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reels" ON reels_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reels" ON reels_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels" ON reels_history
    FOR UPDATE USING (auth.uid() = user_id);
