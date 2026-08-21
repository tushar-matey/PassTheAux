import axios from 'axios';

// Helper to decode HTML entities returned by YouTube API (e.g. &amp;, &#39;, &quot;)
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
};

// Helper to parse ISO 8601 duration (e.g. "PT3M45S", "PT1H2M30S", "PT45S") to total seconds
const parseIsoDuration = (durationStr) => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
};

// Curated music tracks fallback when API key is missing or quota is exceeded
const FALLBACK_TRACKS = [
  {
    youtubeVideoId: '34Na4j8AVgA',
    title: 'The Weeknd - Starboy ft. Daft Punk (Official Music Video)',
    channelTitle: 'The Weeknd',
    thumbnailUrl: 'https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg',
    durationSec: 231
  },
  {
    youtubeVideoId: '4NRXx6U8ABQ',
    title: 'The Weeknd - Blinding Lights (Official Music Video)',
    channelTitle: 'The Weeknd',
    thumbnailUrl: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
    durationSec: 261
  },
  {
    youtubeVideoId: 'H5v3kku4y6Q',
    title: 'Harry Styles - As It Was (Official Video)',
    channelTitle: 'HarryStylesVEVO',
    thumbnailUrl: 'https://i.ytimg.com/vi/H5v3kku4y6Q/hqdefault.jpg',
    durationSec: 167
  },
  {
    youtubeVideoId: 'G7KNmW9a75Y',
    title: 'Miley Cyrus - Flowers (Official Video)',
    channelTitle: 'MileyCyrusVEVO',
    thumbnailUrl: 'https://i.ytimg.com/vi/G7KNmW9a75Y/hqdefault.jpg',
    durationSec: 201
  },
  {
    youtubeVideoId: 'XXYlFuWEuKI',
    title: 'The Weeknd - Save Your Tears (Official Music Video)',
    channelTitle: 'The Weeknd',
    thumbnailUrl: 'https://i.ytimg.com/vi/XXYlFuWEuKI/hqdefault.jpg',
    durationSec: 249
  },
  {
    youtubeVideoId: 'JGwWNGJdvx8',
    title: 'Ed Sheeran - Shape of You (Official Music Video)',
    channelTitle: 'Ed Sheeran',
    thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    durationSec: 264
  },
  {
    youtubeVideoId: 'k4V3Ui68k7U',
    title: 'Taylor Swift - Cruel Summer (Official Audio)',
    channelTitle: 'Taylor Swift',
    thumbnailUrl: 'https://i.ytimg.com/vi/k4V3Ui68k7U/hqdefault.jpg',
    durationSec: 179
  },
  {
    youtubeVideoId: 'fJ9rUzIMcZQ',
    title: 'Queen - Bohemian Rhapsody (Official Video Remastered)',
    channelTitle: 'Queen Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    durationSec: 360
  },
  {
    youtubeVideoId: 'L_LUpnjgPso',
    title: 'Dua Lipa - Levitating (Official Music Video)',
    channelTitle: 'Dua Lipa',
    thumbnailUrl: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg',
    durationSec: 208
  },
  {
    youtubeVideoId: 'y83x7Wg21mQ',
    title: 'Post Malone, Swae Lee - Sunflower (Spider-Man: Into the Spider-Verse)',
    channelTitle: 'PostMaloneVEVO',
    thumbnailUrl: 'https://i.ytimg.com/vi/y83x7Wg21mQ/hqdefault.jpg',
    durationSec: 158
  }
];

class YouTubeService {
  constructor() {
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  getApiKey() {
    return process.env.YOUTUBE_API_KEY || null;
  }

  /**
   * Search for tracks on YouTube
   * 1. Calls search.list endpoint for video results
   * 2. Calls separate videos.list endpoint to retrieve duration (contentDetails)
   */
  async searchVideos(query, maxResults = 20) {
    if (!query || !query.trim()) {
      return [];
    }

    const apiKey = this.getApiKey();

    if (!apiKey) {
      console.warn(
        '[YouTubeService] ⚠️ YOUTUBE_API_KEY is not set in server environment. Returning matching fallback music tracks.'
      );
      return this.getFallbackResults(query);
    }

    try {
      // Step 1: Call search.list (prefer music category 10)
      let searchUrl = `${this.baseUrl}/search?part=snippet&type=video&videoCategoryId=10&maxResults=${maxResults}&q=${encodeURIComponent(
        query
      )}&key=${apiKey}`;

      let searchRes;
      try {
        searchRes = await axios.get(searchUrl);
      } catch (catErr) {
        // If category filter returns no results or is restricted, retry without category filter
        searchUrl = `${this.baseUrl}/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(
          query
        )}&key=${apiKey}`;
        searchRes = await axios.get(searchUrl);
      }

      const items = searchRes.data?.items || [];
      if (items.length === 0) {
        return [];
      }

      // Step 2: Extract video IDs for separate duration fetch
      const videoIds = items
        .map((item) => item.id?.videoId)
        .filter(Boolean)
        .join(',');

      if (!videoIds) {
        return [];
      }

      // Step 3: Call videos.list endpoint with part=contentDetails,snippet to fetch duration & metadata
      const videosUrl = `${this.baseUrl}/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`;
      const videosRes = await axios.get(videosUrl);
      const videoDetails = videosRes.data?.items || [];

      // Create lookup map by video ID
      const videoMap = new Map();
      for (const v of videoDetails) {
        videoMap.set(v.id, v);
      }

      // Step 4: Map and normalize results
      return items
        .map((item) => {
          const videoId = item.id?.videoId;
          if (!videoId) return null;

          const detail = videoMap.get(videoId);
          const durationSec = detail
            ? parseIsoDuration(detail.contentDetails?.duration)
            : 0;

          const title = decodeHtmlEntities(item.snippet?.title || 'Unknown Title');
          const channelTitle = decodeHtmlEntities(
            item.snippet?.channelTitle || 'Unknown Artist'
          );

          const thumbnailUrl =
            detail?.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.high?.url ||
            detail?.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

          return {
            youtubeVideoId: videoId,
            title,
            channelTitle,
            thumbnailUrl,
            durationSec,
            durationMs: durationSec * 1000
          };
        })
        .filter(Boolean);
    } catch (error) {
      this.handleApiError(error);
      return this.getFallbackResults(query);
    }
  }

  /**
   * Fetch single video details by YouTube video ID
   */
  async getVideoDetails(videoId) {
    if (!videoId) return null;
    const apiKey = this.getApiKey();

    if (!apiKey) {
      const fallback = FALLBACK_TRACKS.find((t) => t.youtubeVideoId === videoId);
      return fallback || null;
    }

    try {
      const url = `${this.baseUrl}/videos?part=contentDetails,snippet&id=${videoId}&key=${apiKey}`;
      const res = await axios.get(url);
      const item = res.data?.items?.[0];
      if (!item) return null;

      const durationSec = parseIsoDuration(item.contentDetails?.duration);
      return {
        youtubeVideoId: item.id,
        title: decodeHtmlEntities(item.snippet?.title || ''),
        channelTitle: decodeHtmlEntities(item.snippet?.channelTitle || ''),
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
        durationSec,
        durationMs: durationSec * 1000
      };
    } catch (error) {
      this.handleApiError(error);
      return null;
    }
  }

  /**
   * Log helpful warnings on API quota or auth issues
   */
  handleApiError(error) {
    const status = error.response?.status;
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message;
    const reason = errorData?.errors?.[0]?.reason;

    if (
      status === 403 &&
      (reason === 'quotaExceeded' ||
        reason === 'rateLimitExceeded' ||
        message.includes('quota') ||
        message.includes('RESOURCE_EXHAUSTED'))
    ) {
      console.warn(
        '⚠️ [YouTubeService] YouTube Data API daily quota exceeded. Using fallback music catalog. (Google Cloud Console limits daily free quota to 10,000 units).'
      );
    } else if (status === 400 || status === 403) {
      console.warn(
        `⚠️ [YouTubeService] YouTube API error (${status}): ${message}. Verify YOUTUBE_API_KEY in server/.env.`
      );
    } else {
      console.error(`[YouTubeService] Request failed: ${message}`);
    }
  }

  /**
   * Filter fallback tracks based on search query
   */
  getFallbackResults(query) {
    const q = query.toLowerCase().trim();
    const matched = FALLBACK_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.channelTitle.toLowerCase().includes(q)
    );

    if (matched.length > 0) {
      return matched.map((t) => ({ ...t, durationMs: t.durationSec * 1000 }));
    }

    // If no direct substring match, return all fallback tracks so users still get results
    return FALLBACK_TRACKS.map((t) => ({
      ...t,
      durationMs: t.durationSec * 1000
    }));
  }
}

const youtubeService = new YouTubeService();
export default youtubeService;
