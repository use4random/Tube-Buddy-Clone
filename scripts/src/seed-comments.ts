import { db, commentsTable } from "@workspace/db";

const now = Date.now();
const hr = 3_600_000;
const day = 86_400_000;

const comments = [
  { id: "yt_c1", channelId: 1, videoId: "dQw4w9WgXcQ", videoTitle: "How I Grew to 10k Subs in 6 Months", authorName: "Sarah K", text: "This video changed my channel completely! Went from 200 to 2k subs in 2 months. Thank you so much!", likeCount: 47, isReplied: false, isFlagged: false, publishedAt: new Date(now - hr) },
  { id: "yt_c2", channelId: 1, videoId: "dQw4w9WgXcQ", videoTitle: "How I Grew to 10k Subs in 6 Months", authorName: "Mike Torres", text: "Could you do a video specifically on thumbnail design? I feel like that's my biggest weakness right now", likeCount: 23, isReplied: false, isFlagged: false, publishedAt: new Date(now - 2 * hr) },
  { id: "yt_c3", channelId: 1, videoId: "dQw4w9WgXcQ", videoTitle: "How I Grew to 10k Subs in 6 Months", authorName: "Emma L", text: "Great content as always! Do you recommend posting daily or 3x per week for a new channel?", likeCount: 15, isReplied: true, isFlagged: false, publishedAt: new Date(now - day) },
  { id: "yt_c4", channelId: 1, videoId: "abc123xyz", videoTitle: "YouTube SEO Secrets 2024", authorName: "Spam Bot 9000", text: "Buy cheap views and subscribers!! 1000 subs for only $5!! Click here: spam.link/fake", likeCount: 0, isReplied: false, isFlagged: true, publishedAt: new Date(now - 3 * hr) },
  { id: "yt_c5", channelId: 1, videoId: "abc123xyz", videoTitle: "YouTube SEO Secrets 2024", authorName: "David Chen", text: "Subscribed! Been watching you for 3 years and this is your best video yet. Keep it up!", likeCount: 31, isReplied: false, isFlagged: false, publishedAt: new Date(now - 2 * day) },
  { id: "yt_c6", channelId: 1, videoId: "abc123xyz", videoTitle: "YouTube SEO Secrets 2024", authorName: "Julia R", text: "Wait, at 4:32 you mention using TubePulse — does that actually work for small channels too?", likeCount: 8, isReplied: false, isFlagged: false, publishedAt: new Date(now - 3 * day) },
  { id: "yt_c7", channelId: 1, videoId: "xyz789abc", videoTitle: "The Perfect Upload Schedule", authorName: "Priya M", text: "Best YouTube growth tutorial I've watched this year. The keyword strategy alone doubled my CTR!", likeCount: 62, isReplied: false, isFlagged: false, publishedAt: new Date(now - 4 * hr) },
  { id: "yt_c8", channelId: 1, videoId: "xyz789abc", videoTitle: "The Perfect Upload Schedule", authorName: "Tom W", text: "I've been struggling with monetization for ages. Would love a dedicated video on AdSense approval tips.", likeCount: 19, isReplied: false, isFlagged: false, publishedAt: new Date(now - 5 * hr) },
];

async function main() {
  console.log("Seeding demo comments...");
  for (const c of comments) {
    await db
      .insert(commentsTable)
      .values(c)
      .onConflictDoNothing();
  }
  console.log(`Done — inserted up to ${comments.length} comments.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
