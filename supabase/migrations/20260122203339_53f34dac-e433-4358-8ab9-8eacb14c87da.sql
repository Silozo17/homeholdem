-- Create chip templates table (stores club's chip set configurations)
CREATE TABLE public.chip_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Set',
  is_active BOOLEAN NOT NULL DEFAULT true,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chip denominations table (individual chip values within a template)
CREATE TABLE public.chip_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.chip_templates(id) ON DELETE CASCADE,
  denomination INTEGER NOT NULL,
  color TEXT NOT NULL,
  cash_value DECIMAL(10,2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chip_denominations ENABLE ROW LEVEL SECURITY;

-- RLS policies for chip_templates
CREATE POLICY "Club members can view chip templates"
ON public.chip_templates FOR SELECT
USING (is_club_member(auth.uid(), club_id));

CREATE POLICY "Club admins can create chip templates"
ON public.chip_templates FOR INSERT
WITH CHECK (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can update chip templates"
ON public.chip_templates FOR UPDATE
USING (is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Club admins can delete chip templates"
ON public.chip_templates FOR DELETE
USING (is_club_admin_or_owner(auth.uid(), club_id));

-- RLS policies for chip_denominations (access through template's club)
CREATE POLICY "Club members can view chip denominations"
ON public.chip_denominations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chip_templates ct
  WHERE ct.id = chip_denominations.template_id
  AND is_club_member(auth.uid(), ct.club_id)
));

CREATE POLICY "Club admins can create chip denominations"
ON public.chip_denominations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chip_templates ct
  WHERE ct.id = chip_denominations.template_id
  AND is_club_admin_or_owner(auth.uid(), ct.club_id)
));

CREATE POLICY "Club admins can update chip denominations"
ON public.chip_denominations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.chip_templates ct
  WHERE ct.id = chip_denominations.template_id
  AND is_club_admin_or_owner(auth.uid(), ct.club_id)
));

CREATE POLICY "Club admins can delete chip denominations"
ON public.chip_denominations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.chip_templates ct
  WHERE ct.id = chip_denominations.template_id
  AND is_club_admin_or_owner(auth.uid(), ct.club_id)
));

-- Add updated_at trigger for chip_templates
CREATE TRIGGER update_chip_templates_updated_at
BEFORE UPDATE ON public.chip_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create default chip template when club is created
CREATE OR REPLACE FUNCTION public.create_default_chip_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Create default chip template
  INSERT INTO public.chip_templates (club_id, name, currency)
  VALUES (NEW.id, 'Default Set', 'GBP')
  RETURNING id INTO template_id;
  
  -- Create default denominations
  INSERT INTO public.chip_denominations (template_id, denomination, color, cash_value, display_order)
  VALUES 
    (template_id, 1, 'white', 0.10, 1),
    (template_id, 5, 'red', 0.50, 2),
    (template_id, 25, 'green', 2.50, 3),
    (template_id, 100, 'blue', 10.00, 4),
    (template_id, 500, 'black', 50.00, 5),
    (template_id, 1000, 'purple', 100.00, 6);
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create default chip template
CREATE TRIGGER create_club_chip_template
AFTER INSERT ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.create_default_chip_template();