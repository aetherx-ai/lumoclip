import { GoogleGenAI, Type } from '@google/genai';
import { TranscriptSegment, ClipCaptions } from '../types.js';

let genAI: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAI;
}

export interface HighlightOutput {
  title: string;
  start_time: number;
  end_time: number;
  hook_reason: string;
  score: number;
  transcript_snippet: string;
  titles: string[];
  captions: ClipCaptions;
  hashtags: string[];
  cta: string;
}

export async function generateTranscriptWithAI(
  videoTitle: string,
  sourceUrl?: string
): Promise<TranscriptSegment[]> {
  const ai = getAIClient();

  if (!ai) {
    // Fallback realistic transcript
    return [
      { id: 't1', start: 0, end: 15, text: `Welcome to this guide on ${videoTitle}. Today we are breaking down the exact strategy to achieve maximum performance.`, speaker: 'Speaker 1' },
      { id: 't2', start: 15, end: 35, text: "Most people fail because they focus on the wrong metrics. They waste weeks perfecting minor details that don't drive real growth.", speaker: 'Speaker 1' },
      { id: 't3', start: 35, end: 55, text: "Instead, here is the secret framework that top 1% creators and tech teams use every single day.", speaker: 'Speaker 2' },
      { id: 't4', start: 55, end: 85, text: "First, automate your workflow. Second, focus on high-retention short content. Third, repurpose across all platforms simultaneously.", speaker: 'Speaker 2' },
      { id: 't5', start: 85, end: 110, text: "When we implemented this, our reach exploded by 400% in under three weeks. It works every time.", speaker: 'Speaker 1' },
      { id: 't6', start: 110, end: 135, text: "If you want to scale your results faster, start applying these exact steps starting today.", speaker: 'Speaker 1' },
    ];
  }

  try {
    const prompt = `Generate a realistic 2-minute video transcript for a video titled "${videoTitle}".
    Break it down into 6-8 distinct chronological segments with speaker labels and start/end times in seconds (from 0 to 120s). Return JSON array of segments with start, end, text, speaker.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER },
              text: { type: Type.STRING },
              speaker: { type: Type.STRING },
            },
            required: ['start', 'end', 'text', 'speaker'],
          },
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      return parsed.map((item: any, idx: number) => ({
        id: `t_${idx + 1}`,
        start: item.start || idx * 18,
        end: item.end || (idx + 1) * 18,
        text: item.text || '',
        speaker: item.speaker || 'Speaker',
      }));
    }
  } catch (error) {
    console.error('Error generating transcript with Gemini AI:', error);
  }

  // Smart fallback if AI response parsing had issues
  return [
    { id: 't1', start: 0, end: 18, text: `Welcome to this breakdown on ${videoTitle}. Here is the core lesson you need to know.`, speaker: 'Host' },
    { id: 't2', start: 18, end: 42, text: "The biggest mistake people make is trying to do everything manually instead of leveraging AI tools.", speaker: 'Guest' },
    { id: 't3', start: 42, end: 70, text: "Here is the exact 3-step blueprint to repurpose long video into viral short clips automatically.", speaker: 'Guest' },
    { id: 't4', start: 70, end: 98, text: "Post 3 vertical clips daily on TikTok, Reels, and YouTube Shorts for consistent 10x distribution.", speaker: 'Host' },
  ];
}

export async function detectViralHighlightsWithAI(
  transcript: TranscriptSegment[],
  videoTitle: string
): Promise<HighlightOutput[]> {
  const ai = getAIClient();

  const transcriptText = transcript.map((t) => `[${t.start}s - ${t.end}s] ${t.speaker}: ${t.text}`).join('\n');

  if (!ai) {
    // Generate high quality fallback highlights
    return generateFallbackHighlights(transcript, videoTitle);
  }

  try {
    const prompt = `You are a viral short-form content producer expert (TikTok, Instagram Reels, YouTube Shorts).
Analyze the following transcript from the video "${videoTitle}":

${transcriptText}

Extract 4 to 6 high-viral moments suitable for 30-60 second vertical clips.
For each clip:
1. Identify the exact start_time and end_time (in seconds) from transcript.
2. Calculate a confidence score (80 to 99) for viral potential.
3. Write a compelling hook_reason explaining WHY this moment will perform well.
4. Provide a transcript snippet excerpt.
5. Write 5 catchy viral titles (with emojis).
6. Write custom platform captions for TikTok, Instagram Reels, YouTube Shorts, and Facebook.
7. List 5-6 trending hashtags.
8. Write 1 engagement CTA question for viewers.

Return a JSON array of objects.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              start_time: { type: Type.NUMBER },
              end_time: { type: Type.NUMBER },
              hook_reason: { type: Type.STRING },
              score: { type: Type.NUMBER },
              transcript_snippet: { type: Type.STRING },
              titles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              captions: {
                type: Type.OBJECT,
                properties: {
                  tiktok: { type: Type.STRING },
                  instagram: { type: Type.STRING },
                  youtube_shorts: { type: Type.STRING },
                  facebook: { type: Type.STRING },
                },
                required: ['tiktok', 'instagram', 'youtube_shorts', 'facebook'],
              },
              hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              cta: { type: Type.STRING },
            },
            required: [
              'title',
              'start_time',
              'end_time',
              'hook_reason',
              'score',
              'transcript_snippet',
              'titles',
              'captions',
              'hashtags',
              'cta',
            ],
          },
        },
      },
    });

    if (response.text) {
      const parsed: HighlightOutput[] = JSON.parse(response.text.trim());
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Gemini highlight detection error:', err);
  }

  return generateFallbackHighlights(transcript, videoTitle);
}

function generateFallbackHighlights(
  transcript: TranscriptSegment[],
  videoTitle: string
): HighlightOutput[] {
  const totalDuration = transcript[transcript.length - 1]?.end || 120;
  
  return [
    {
      title: `The Ultimate Secret Behind ${videoTitle.slice(0, 30)}...`,
      start_time: 15,
      end_time: Math.min(50, totalDuration),
      hook_reason: 'Exposes common industry mistake in the first 3 seconds, creating curiosity gap.',
      score: 97,
      transcript_snippet: transcript.slice(0, 3).map((t) => t.text).join(' '),
      titles: [
        `Stop Doing This on ${videoTitle.slice(0, 20)}! 🛑`,
        `The 1 Secret Top 1% Creators Don't Share 🤫`,
        `Why 90% Fail at ${videoTitle.slice(0, 20)} 😱`,
        `How We Reached 100k Reach in 14 Days 📈`,
        `The Ultimate Blueprint Revealed 🔥`,
      ],
      captions: {
        tiktok: `The brutal truth about ${videoTitle.slice(0, 30)} 💡 Watch till the end for the key takeaway! #viral #tips #lumoclip`,
        instagram: `Are you making this critical mistake? 🤯 Save this reel for later and share with a friend building in public! 🚀`,
        youtube_shorts: `The Unfiltered Truth About ${videoTitle.slice(0, 25)} #shorts #growth #ai`,
        facebook: `Here is the step-by-step strategy that transformed our results this month.`,
      },
      hashtags: ['#viraltips', '#contentcreation', '#growth', '#lumoclip', '#aipowered'],
      cta: 'Which step are you trying first today? Leave a comment below! 👇',
    },
    {
      title: '3 Simple Steps to Scale 10x Faster',
      start_time: Math.min(50, totalDuration - 40),
      end_time: Math.min(95, totalDuration),
      hook_reason: 'High actionable value delivery with numbered list structure perfect for vertical engagement.',
      score: 92,
      transcript_snippet: transcript.slice(2, 5).map((t) => t.text).join(' '),
      titles: [
        '3 Steps to 10x Your Content Distribution 💥',
        'How to Turn 1 Video into 30 Short Clips',
        'Automate Your Video Workflow with AI 🤖',
        'The Fastest Way to Scale Short Content',
        'Mastering Short-Form Video in 2026 📱',
      ],
      captions: {
        tiktok: `3 steps to automate your video repurposing in 30 seconds ⚡️ Link in bio to try LumoClip AI! #saas #contentcreator`,
        instagram: `Transform long podcast episodes into vertical short clips effortlessly ✨ Comment 'CLIP' for full access!`,
        youtube_shorts: `How to Repurpose Any YouTube Video into Shorts #shorts #marketing`,
        facebook: `Watch how AI helps creators post 3x more content without spending extra hours editing.`,
      },
      hashtags: ['#automation', '#videoeditor', '#contentmarketing', '#repurposing', '#lumoclip'],
      cta: 'Do you prefer TikTok or Instagram Reels for video discovery?',
    },
  ];
}
