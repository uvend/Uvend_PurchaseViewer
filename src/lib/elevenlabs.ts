import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

function speechClient() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim() || process.env.elevenlabs_api_key?.trim();

  return new ElevenLabsClient(apiKey ? { apiKey } : undefined);
}

export async function transcribeSpeech(file: File) {
  const result = await speechClient().speechToText.convert({
    file,
    modelId: "scribe_v2",
    tagAudioEvents: false,
    noVerbatim: true,
  });

  return "text" in result ? result.text.trim() : "";
}
