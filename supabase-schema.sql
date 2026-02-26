-- 가게 테이블
CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT DEFAULT '',
  atmosphere TEXT DEFAULT '',
  main_products TEXT DEFAULT '',
  tone TEXT DEFAULT 'friendly',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 콘텐츠 테이블
CREATE TABLE IF NOT EXISTS contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'threads', 'blog')),
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  link TEXT, -- 발행된 실제 포스트 주소
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}', -- 다중 이미지 지원
  is_published BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ, -- 예약 발행 시간
  status TEXT DEFAULT 'pending', -- 발행 상태 (pending, published)
  views INTEGER DEFAULT 0, -- 조회수
  likes INTEGER DEFAULT 0, -- 좋아요/공감 수
  comments INTEGER DEFAULT 0, -- 댓글 수
  last_stats_updated_at TIMESTAMPTZ, -- 마지막 통계 갱신 시간
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_contents_user ON contents(user_id);
CREATE INDEX IF NOT EXISTS idx_contents_created ON contents(created_at DESC);

-- RLS 활성화
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 데이터만 접근
CREATE POLICY "Users can view own stores" ON stores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stores" ON stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stores" ON stores FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own contents" ON contents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contents" ON contents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contents" ON contents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contents" ON contents FOR DELETE USING (auth.uid() = user_id);
