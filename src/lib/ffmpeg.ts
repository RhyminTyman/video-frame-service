import ffmpegLib from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

if (!ffmpegStatic) throw new Error('ffmpeg-static path not resolved');
ffmpegLib.setFfmpegPath(ffmpegStatic as string);
// ffprobe is not needed for our use case - we'll use ffmpeg for duration probing

export const ffmpeg = ffmpegLib;
