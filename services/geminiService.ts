
// This service is disabled in Scribe Desktop Offline Edition.
// Subtitles are now managed locally via SRT files.
export const transcribeVideo = async () => {
  throw new Error("Online transcription is disabled in offline mode.");
};
