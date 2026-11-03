/* MP3 encoding stays on this device and off the interface thread. */
importScripts('vendor/lame.min.js');
self.onmessage = ({data}) => {
  try {
    const channels = data.channels.map(buffer => new Float32Array(buffer));
    const encoder = new lamejs.Mp3Encoder(channels.length, data.sampleRate, 320);
    const chunks = [];
    for (let offset = 0; offset < channels[0].length; offset += 1152) {
      const pcm = channels.map(channel => {
        const result = new Int16Array(Math.min(1152, channel.length - offset));
        for (let i = 0; i < result.length; i++) {
          const value = Math.max(-1, Math.min(1, channel[offset + i]));
          result[i] = Math.round(value * (value < 0 ? 32768 : 32767));
        }
        return result;
      });
      const encoded = encoder.encodeBuffer(...pcm);
      if (encoded.length) chunks.push(new Int8Array(encoded));
    }
    const tail = encoder.flush();
    if (tail.length) chunks.push(new Int8Array(tail));
    self.postMessage({blob: new Blob(chunks, {type: 'audio/mpeg'})});
  } catch (error) {
    self.postMessage({error: error.message});
  }
};
