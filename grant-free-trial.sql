-- 1. 기존 가입자(또는 특정 사용자)에게 7일 무료 체험판을 일괄 부여하는 방법
-- (현재 구독이 없거나 'basic'인 사용자를 'free_trial'로 변경하고 7일 만료일 설정)

-- 만약 모든 기존 가입자를 무료체험으로 전환하고 싶다면 아래를 실행하세요:
INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end, trial_ends_at)
SELECT 
    id as user_id, 
    'free_trial' as plan, 
    'active' as status,
    now() as current_period_start,
    now() + interval '7 days' as current_period_end,
    now() + interval '7 days' as trial_ends_at
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
    plan = 'free_trial',
    trial_ends_at = now() + interval '7 days',
    current_period_end = now() + interval '7 days',
    status = 'active'
WHERE subscriptions.plan = 'basic' OR subscriptions.plan IS NULL;

-- 2. 앞으로 새로 가입하는 유저에게 자동으로 'free_trial' 7일을 부여하는 트리거 (필요시 실행)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end, trial_ends_at)
  VALUES (
    NEW.id,
    'free_trial',
    'active',
    now(),
    now() + interval '7 days',
    now() + interval '7 days'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_subscription();
