-- Allow admins to manage all orders
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins have full access to orders" 
ON public.orders 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage all tickets
CREATE POLICY "Admins have full access to tickets" 
ON public.tickets 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to manage all wallet transactions
CREATE POLICY "Admins have full access to wallet_transactions" 
ON public.wallet_transactions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));
