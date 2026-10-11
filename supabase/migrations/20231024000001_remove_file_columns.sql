-- Remove file-related columns from posts table
ALTER TABLE public.posts 
DROP COLUMN IF EXISTS file_name,
DROP COLUMN IF EXISTS file_url,
DROP COLUMN IF EXISTS file_type;
