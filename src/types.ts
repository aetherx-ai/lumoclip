export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  credits: number;
  plan: "free" | "pro" | "agency";
  created_at: string;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export type ProjectStatus =
  | "draft"
  | "uploading"
  | "extracting_audio"
  | "transcribing"
  | "analyzing"
  | "rendering"
  | "completed"
  | "failed";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  status: ProjectStatus;
  source_type: "youtube" | "podcast" | "upload";
  source_url?: string;
  duration: number;
  thumbnail_url?: string;
  transcript?: TranscriptSegment[];
  created_at: string;
  updated_at: string;
  progress?: number;
  current_step?: string;
}

export interface SubtitleStyle {
  font: string;
  textColor: string;
  highlightColor: string;
  position: "bottom" | "center" | "top";
  animation: "bounce" | "word" | "highlight" | "fade";
  fontSize: number;
  uppercase: boolean;
}

export interface ClipCaptions {
  tiktok: string;
  instagram: string;
  youtube_shorts: string;
  facebook: string;
}

export interface Clip {
  id: string;
  project_id: string;

  video_url: string;
  thumbnail_url: string;

  start_time: number;
  end_time: number;
  duration: number;

  title: string;
  hook_reason: string;

  score: number;

  captions: ClipCaptions;

  titles: string[];
  hashtags: string[];
  cta: string;

  subtitle_style: SubtitleStyle;

  transcript_snippet: string;

  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  action: string;
  credits_used: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id?: string;

  plan: "free" | "pro" | "agency";

  status: "active" | "canceled" | "past_due";

  renews_at?: string;
}

export interface SampleVideoTemplate {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnail: string;
  category: string;
}