-- Create default chip templates for existing clubs that don't have one
DO $$
DECLARE
  club_record RECORD;
  new_template_id UUID;
BEGIN
  FOR club_record IN 
    SELECT c.id 
    FROM public.clubs c 
    WHERE NOT EXISTS (
      SELECT 1 FROM public.chip_templates ct WHERE ct.club_id = c.id
    )
  LOOP
    -- Create template
    INSERT INTO public.chip_templates (club_id, name, currency)
    VALUES (club_record.id, 'Default Set', 'GBP')
    RETURNING id INTO new_template_id;
    
    -- Create default denominations
    INSERT INTO public.chip_denominations (template_id, denomination, color, cash_value, display_order)
    VALUES 
      (new_template_id, 1, 'white', 0.10, 1),
      (new_template_id, 5, 'red', 0.50, 2),
      (new_template_id, 25, 'green', 2.50, 3),
      (new_template_id, 100, 'blue', 10.00, 4),
      (new_template_id, 500, 'black', 50.00, 5),
      (new_template_id, 1000, 'purple', 100.00, 6);
  END LOOP;
END $$;