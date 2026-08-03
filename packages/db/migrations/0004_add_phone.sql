-- Custom SQL migration file, put your code below! --

-- Capture an optional mobile number on the profile.
ALTER TABLE "profiles" ADD COLUMN "phone" text;
--> statement-breakpoint

-- Update the signup trigger to also copy the phone from the user's auth
-- metadata into the profile row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	INSERT INTO public.profiles (id, email, full_name, phone)
	VALUES (
		NEW.id,
		NEW.email,
		NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
		NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
	)
	ON CONFLICT (id) DO NOTHING;
	RETURN NEW;
END;
$$;
