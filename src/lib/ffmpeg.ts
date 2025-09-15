import ffmpegLib from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

if (!ffmpegStatic) throw new Error('ffmpeg-static path not resolved');
ffmpegLib.setFfmpegPath(ffmpegStatic as string);
ffmpegLib.setFfprobePath(ffprobeInstaller.path);

export const ffmpeg = ffmpegLib;
