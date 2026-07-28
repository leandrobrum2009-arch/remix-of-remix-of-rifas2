-- Drop the redundant 1-argument version of handle_order_payment to resolve ambiguity
DROP FUNCTION IF EXISTS public.handle_order_payment(uuid);

-- Ensure pay_with_balance calls the remaining version correctly (it already does as the remaining one has defaults)
-- But let's re-verify/re-define it just in case to be safe.

-- Add missing UPDATE policy for orders so users can attach proofs or update their own orders
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Also add a policy for deleting if needed, but not strictly necessary for payment
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
CREATE POLICY "Users can delete their own orders" 
ON public.orders 
FOR DELETE 
USING (auth.uid() = user_id);
