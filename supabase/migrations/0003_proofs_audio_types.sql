-- Reference notebook audio: allow larger files (50 MB) and the other names browsers give common audio types.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/vnd.wave','audio/mp4','audio/x-m4a','audio/m4a','audio/aac','audio/ogg','audio/webm','audio/flac','audio/x-flac','audio/aiff','audio/x-aiff']
where id = 'proofs';
