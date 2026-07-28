CREATE OR REPLACE FUNCTION public.increment_balance(amount numeric, user_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET balance = balance + amount
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;