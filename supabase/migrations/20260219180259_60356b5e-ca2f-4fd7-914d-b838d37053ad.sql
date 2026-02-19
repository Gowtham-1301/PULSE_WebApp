-- Create a private storage bucket for ML model files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ml-models',
  'ml-models',
  false,
  104857600, -- 100MB limit for large model files
  ARRAY['application/octet-stream', 'application/x-hdf5', 'application/json', 'application/zip']
);

-- Allow authenticated users to upload their own models
CREATE POLICY "Users can upload their own models"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ml-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own models
CREATE POLICY "Users can read their own models"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ml-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own models
CREATE POLICY "Users can delete their own models"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ml-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);