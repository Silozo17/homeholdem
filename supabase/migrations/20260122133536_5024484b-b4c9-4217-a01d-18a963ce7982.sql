-- Create enum for club member roles
CREATE TYPE public.club_role AS ENUM ('owner', 'admin', 'member');

-- Create profiles table for user display info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create club_members table (linking users to clubs with roles)
CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.club_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check club membership
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id AND club_id = _club_id
  )
$$;

-- Create security definer function to check club role
CREATE OR REPLACE FUNCTION public.has_club_role(_user_id UUID, _club_id UUID, _role club_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id 
      AND club_id = _club_id 
      AND role = _role
  )
$$;

-- Create security definer function to check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_club_admin_or_owner(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE user_id = _user_id 
      AND club_id = _club_id 
      AND role IN ('owner', 'admin')
  )
$$;

-- Function to generate a unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger to auto-generate invite code for new clubs
CREATE OR REPLACE FUNCTION public.set_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
BEGIN
  LOOP
    new_code := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clubs WHERE invite_code = new_code);
  END LOOP;
  NEW.invite_code := new_code;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clubs_set_invite_code
BEFORE INSERT ON public.clubs
FOR EACH ROW
WHEN (NEW.invite_code IS NULL OR NEW.invite_code = '')
EXECUTE FUNCTION public.set_invite_code();

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- RLS Policies for clubs
CREATE POLICY "Members can view their clubs"
ON public.clubs FOR SELECT
TO authenticated
USING (public.is_club_member(auth.uid(), id));

CREATE POLICY "Anyone can view club by invite code"
ON public.clubs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create clubs"
ON public.clubs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins and owners can update their clubs"
ON public.clubs FOR UPDATE
TO authenticated
USING (public.is_club_admin_or_owner(auth.uid(), id))
WITH CHECK (public.is_club_admin_or_owner(auth.uid(), id));

CREATE POLICY "Owners can delete their clubs"
ON public.clubs FOR DELETE
TO authenticated
USING (public.has_club_role(auth.uid(), id, 'owner'));

-- RLS Policies for club_members
CREATE POLICY "Members can view their club members"
ON public.club_members FOR SELECT
TO authenticated
USING (public.is_club_member(auth.uid(), club_id));

CREATE POLICY "Users can join clubs"
ON public.club_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and owners can update members"
ON public.club_members FOR UPDATE
TO authenticated
USING (public.is_club_admin_or_owner(auth.uid(), club_id))
WITH CHECK (public.is_club_admin_or_owner(auth.uid(), club_id));

CREATE POLICY "Users can leave clubs or admins can remove members"
ON public.club_members FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.is_club_admin_or_owner(auth.uid(), club_id)
);