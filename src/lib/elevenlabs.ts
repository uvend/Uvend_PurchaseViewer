import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient();

export async function transcribeSpeech(file: File) {
  const result = await client.speechToText.convert({
    file,
    modelId: "scribe_v2",
    tagAudioEvents: false,
    noVerbatim: true,
  });

  return "text" in result ? result.text.trim() : "";
}
