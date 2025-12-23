
import { SubtitleLine } from '../types';

export const parseSRT = (data: string): SubtitleLine[] => {
  const lines = data.replace(/\r/g, '').split('\n');
  const result: SubtitleLine[] = [];
  let current: Partial<SubtitleLine> = {};

  const timeToSeconds = (timeStr: string): number => {
    const [hours, minutes, secondsAndMillis] = timeStr.split(':');
    const [seconds, millis] = secondsAndMillis.split(',');
    return (
      parseInt(hours, 10) * 3600 +
      parseInt(minutes, 10) * 60 +
      parseInt(seconds, 10) +
      parseInt(millis, 10) / 1000
    );
  };

  let state: 'id' | 'time' | 'text' = 'id';

  for (let line of lines) {
    line = line.trim();
    if (state === 'id') {
      if (line !== '') {
        current.id = line;
        state = 'time';
      }
    } else if (state === 'time') {
      const match = line.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      if (match) {
        current.startTime = timeToSeconds(match[1]);
        current.endTime = timeToSeconds(match[2]);
        state = 'text';
      }
    } else if (state === 'text') {
      if (line === '') {
        if (current.text) {
          result.push(current as SubtitleLine);
        }
        current = {};
        state = 'id';
      } else {
        current.text = current.text ? `${current.text}\n${line}` : line;
      }
    }
  }

  if (current.text) {
    result.push(current as SubtitleLine);
  }

  return result;
};

// Fix: Changed property name 'lang' to 'language' to satisfy the SubtitleTrack interface requirements.
export const detectLanguage = (fileName: string): { language: 'zh' | 'en' | 'auto', label: string } => {
  const lower = fileName.toLowerCase();
  if (lower.includes('zh') || lower.includes('cn') || lower.includes('chi')) return { language: 'zh', label: '中文' };
  if (lower.includes('en') || lower.includes('eng')) return { language: 'en', label: 'English' };
  return { language: 'auto', label: 'Unknown' };
};
