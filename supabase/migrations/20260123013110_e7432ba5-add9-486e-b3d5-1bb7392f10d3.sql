-- Make graphics bucket public so icons can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'graphics';