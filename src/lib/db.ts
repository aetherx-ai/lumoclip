import { User, Project, Clip, UsageLog, Subscription, TranscriptSegment } from '../types.js';

// Initial Mock Seed Data for LumoClip
const INITIAL_USER: User = {
  id: 'usr_demo123',
  email: 'creator@lumoclip.ai',
  name: 'Alex Rivera',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  credits: 24, // Started with 30, used 6
  plan: 'pro',
  created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
};

const SAMPLE_TRANSCRIPT_1: TranscriptSegment[] = [
  { id: 't1', start: 0, end: 12, text: "Welcome back everyone. Today we're diving into the absolute secret behind why 99% of SaaS startups fail in their first year.", speaker: "Host" },
  { id: 't2', start: 12, end: 28, text: "It's not lack of capital. It's not bad coding. It's building features that nobody actually requested instead of talking to 20 users first.", speaker: "Guest" },
  { id: 't3', start: 28, end: 45, text: "When we launched our first tool, we spent six months in dark mode writing 50,000 lines of code. Zero customers.", speaker: "Guest" },
  { id: 't4', start: 45, end: 68, text: "Then we pivoted to short-form video repurposing. We posted 3 clips a day on TikTok and Instagram Reels. Boom! $10,000 MRR in 30 days.", speaker: "Guest" },
  { id: 't5', start: 68, end: 95, text: "Here is the exact formula: Take a 60 minute podcast episode. Use AI to scan the transcript for high-emotion quotes, crop to 9:16 vertical video, add animated captions, and post consistently.", speaker: "Guest" },
  { id: 't6', start: 95, end: 120, text: "If you aren't short-form clipping your podcasts in 2026, you are leaving 80% of your total distribution on the table.", speaker: "Host" },
];

const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'proj_saas_growth',
    user_id: 'usr_demo123',
    name: 'How We Built a $100k/mo AI SaaS Startup',
    status: 'completed',
    source_type: 'youtube',
    source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 120,
    thumbnail_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&auto=format&fit=crop&q=80',
    transcript: SAMPLE_TRANSCRIPT_1,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    progress: 100,
    current_step: 'Completed',
  },
  {
    id: 'proj_podcast_ep42',
    user_id: 'usr_demo123',
    name: 'The Future of AI & Creator Economy - Ep #42',
    status: 'completed',
    source_type: 'podcast',
    source_url: 'https://podcast.lumoclip.ai/ep42.mp3',
    duration: 180,
    thumbnail_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    progress: 100,
  },
];

const SAMPLE_CLIPS: Clip[] = [
  {
    id: 'clip_101',
    project_id: 'proj_saas_growth',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
    start_time: 12,
    end_time: 45,
    duration: 33,
    title: 'Why 99% of SaaS Startups Fail (And How to Fix It)',
    hook_reason: 'High emotion quote exposing common mistake in first 5 seconds with relatable failure story.',
    score: 98,
    transcript_snippet: "It's not lack of capital. It's not bad coding. It's building features that nobody actually requested... When we launched, we spent 6 months writing code with zero customers.",
    captions: {
      tiktok: "Why 99% of founders fail before making their first $1k 🤯 Stop building in dark mode! Talk to users first 🔥 #saas #startup #entrepreneur #lumoclip",
      instagram: "The brutal truth about SaaS startups in 2026 💡 Save this before starting your next project! Comment 'GROWTH' for full checklist. 🚀",
      youtube_shorts: "Why 99% of Startups Fail in 2026 😱 #shorts #business #startup #tech",
      facebook: "Building a startup? Avoid this major trap that ruins 99% of new founders."
    },
    titles: [
      "Why 99% of SaaS Startups Fail Immediately 😱",
      "The #1 Mistake Every First-Time Founder Makes",
      "Stop Building in Dark Mode for 6 Months!",
      "How to Get Your First 20 Paying Users Fast",
      "The Unfiltered Truth About SaaS Growth 🚀"
    ],
    hashtags: ["#saas", "#startups", "#entrepreneurship", "#viralclips", "#tech", "#lumoclip"],
    cta: "What's the biggest obstacle you're facing in your startup right now? Drop it in the comments below! 👇",
    subtitle_style: {
      font: 'Inter',
      textColor: '#FFFFFF',
      highlightColor: '#FFE600',
      position: 'bottom',
      animation: 'highlight',
      fontSize: 28,
      uppercase: true,
    },
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'clip_102',
    project_id: 'proj_saas_growth',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&auto=format&fit=crop&q=80',
    start_time: 45,
    end_time: 95,
    duration: 50,
    title: 'How We Hit $10k MRR with Short-Form Video',
    hook_reason: 'Strong financial result ($10k MRR in 30 days) followed by actionable 4-step framework.',
    score: 95,
    transcript_snippet: "We pivoted to short-form video repurposing. We posted 3 clips a day on TikTok and Instagram Reels. Boom! $10,000 MRR in 30 days. Here is the exact formula...",
    captions: {
      tiktok: "From $0 to $10,000 MRR in 30 days using short video repurposing 📈 Here is our exact 4-step blueprint! #growth #saas #contentcreator #repurposing",
      instagram: "How short-form videos unlocked $10k MRR for our company 💥 Double tap if you need this workflow! Link in bio to try LumoClip AI.",
      youtube_shorts: "How Short Videos Made Us $10k MRR Fast 💰 #shorts #contentmarketing #ai",
      facebook: "Repurposing podcast episodes into vertical clips is the ultimate growth hack in 2026."
    },
    titles: [
      "How We Reached $10k MRR in 30 Days 📈",
      "The Short-Form Content Blueprint for Creators",
      "Turn 1 Podcast into 30 Viral Clips",
      "Why You're Missing 80% of Potential Reach",
      "The Ultimate Content Repurposing Hack 🔥"
    ],
    hashtags: ["#contentmarketing", "#podcasting", "#viraltips", "#ai tools", "#growthhacking"],
    cta: "Are you repurposing your long videos yet? Let us know your top social platform!",
    subtitle_style: {
      font: 'Montserrat',
      textColor: '#FFFFFF',
      highlightColor: '#00FF66',
      position: 'bottom',
      animation: 'bounce',
      fontSize: 30,
      uppercase: true,
    },
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  }
];

const SAMPLE_USAGE: UsageLog[] = [
  { id: 'u1', user_id: 'usr_demo123', action: 'Project Repurpose: How We Built a $100k/mo AI SaaS Startup', credits_used: 3, created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
  { id: 'u2', user_id: 'usr_demo123', action: 'Project Repurpose: The Future of AI - Ep #42', credits_used: 3, created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
];

class MemoryDatabase {
  private user: User = { ...INITIAL_USER };
  private projects: Project[] = [...SAMPLE_PROJECTS];
  private clips: Clip[] = [...SAMPLE_CLIPS];
  private usageLogs: UsageLog[] = [...SAMPLE_USAGE];
  private subscription: Subscription = {
    id: 'sub_12345',
    user_id: 'usr_demo123',
    plan: 'pro',
    status: 'active',
    renews_at: new Date(Date.now() + 25 * 24 * 3600 * 1000).toISOString(),
  };

  getUser(): User {
    return this.user;
  }

  updateUser(updates: Partial<User>): User {
    this.user = { ...this.user, ...updates };
    return this.user;
  }

  deductCredits(amount: number, actionName: string): boolean {
    if (this.user.credits < amount) return false;
    this.user.credits -= amount;
    this.addUsageLog(actionName, amount);
    return true;
  }

  addCredits(amount: number) {
    this.user.credits += amount;
  }

  getProjects(): Project[] {
    return [...this.projects].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getProjectById(id: string): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Project {
    const newProj: Project = {
      ...project,
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.projects.push(newProj);
    return newProj;
  }

  updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.projects[idx] = {
      ...this.projects[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.projects[idx];
  }

  deleteProject(id: string): boolean {
    this.projects = this.projects.filter((p) => p.id !== id);
    this.clips = this.clips.filter((c) => c.project_id !== id);
    return true;
  }

  getClipsByProject(projectId: string): Clip[] {
    return this.clips.filter((c) => c.project_id === projectId).sort((a, b) => b.score - a.score);
  }

  getClipById(id: string): Clip | undefined {
    return this.clips.find((c) => c.id === id);
  }

  addClip(clip: Omit<Clip, 'id' | 'created_at'>): Clip {
    const newClip: Clip = {
      ...clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.clips.push(newClip);
    return newClip;
  }

  updateClip(id: string, updates: Partial<Clip>): Clip | undefined {
    const idx = this.clips.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.clips[idx] = { ...this.clips[idx], ...updates };
    return this.clips[idx];
  }

  getUsageLogs(): UsageLog[] {
    return [...this.usageLogs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addUsageLog(action: string, credits_used: number): UsageLog {
    const log: UsageLog = {
      id: `log_${Date.now()}`,
      user_id: this.user.id,
      action,
      credits_used,
      created_at: new Date().toISOString(),
    };
    this.usageLogs.push(log);
    return log;
  }

  getSubscription(): Subscription {
    return this.subscription;
  }

  updateSubscription(plan: 'free' | 'pro' | 'agency'): Subscription {
    this.subscription.plan = plan;
    this.subscription.status = 'active';
    this.user.plan = plan;
    if (plan === 'pro') this.user.credits += 50;
    if (plan === 'agency') this.user.credits += 200;
    return this.subscription;
  }
}

export const db = new MemoryDatabase();
