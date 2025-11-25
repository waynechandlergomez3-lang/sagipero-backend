-- Create CitizenMedia table for concerned citizen feature
-- Allows residents to submit photos and videos for emergency situations

CREATE TABLE IF NOT EXISTS public."CitizenMedia" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "mediaUrl" TEXT NOT NULL,
  "mediaType" TEXT DEFAULT 'photo',
  "caption" TEXT,
  "status" TEXT DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP,
  "reviewedBy" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_citizen_media_user_id ON public."CitizenMedia"("userId");
CREATE INDEX IF NOT EXISTS idx_citizen_media_status ON public."CitizenMedia"("status");
CREATE INDEX IF NOT EXISTS idx_citizen_media_created_at ON public."CitizenMedia"("createdAt");
