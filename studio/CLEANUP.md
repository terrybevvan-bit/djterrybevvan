# Master Room restoration

Open **Master Room → Shape your sound → Restoration** after loading a file.

1. Select **Gentle cleanup** (30% noise reduction, 25% shimmer reduction, 25% click repair).
2. Preview the cleaned audio, then the removed sound. Both play before mastering and at the original level. Lower the settings if the removed sound contains musical detail you want to keep.
3. Use the main player to hear the complete master. Restoration automatically uses exact rendering even when the exact-render checkbox is off. Adjusting a restoration knob pauses the main player; press play to render the new settings.
4. Export as usual. Restoration runs before the mastering chain for comparisons, WAV/MP3 exports and batch exports. It does not modify the source file.

All restoration controls default to bypass. Factory mastering presets bypass restoration; custom presets save its settings. Older custom presets load with restoration bypassed.

## Processing

An independent local Web Worker uses a 2048-sample Hann window, a 512-sample hop, FFT spectral attenuation and normalized overlap-add reconstruction. Up to approximately 500 frames across the track are sampled; the quietest 12% estimate the noise power spectrum. One gain mask is shared across channels, smoothed in frequency and time, and limited to 7 dB attenuation per frequency. Original phase, sample rate, channel count, length and sample alignment are preserved by the cleanup stage.

Noise reduction applies across the spectrum. Shimmer reduction adds attenuation above 4.5 kHz, reaching full strength at 7 kHz. Isolated click repair interpolates single-sample outliers when both neighbours agree; it deliberately avoids broader transients. Removed sound is the original minus the complete cleanup result, including click repair, without normalization.

The existing De-fizz tone knob now applies a high shelf above 6.5 kHz, up to a 7 dB cut. It replaces the previous subtraction of a phase-shifted, compressed branch. Selective noise reduction is handled by Restoration.

## Limits

This is signal processing, not a trained source-separation model. It cannot reconstruct missing information, undo sustained clipping, remove all generated vocal artifacts or reliably distinguish hiss from cymbals. The automatic profile can mistake quiet instruments for noise; silent passages can also cause it to underestimate noise. Start gently and audition the residual. The 7 dB limit applies to spectral attenuation, not isolated click repair or the downstream mastering chain. Long tracks take time and memory; cleanup settings are cached per loaded source and parameter set.

Conceptual reference inspected: https://musiccleanerpro.musictechtools.xyz/ (Music Cleanup Pro v2). Implementation is original; no runtime dependency on that site.

## Verification

Run `npm test` with Node.js. Tests cover bypass, silence/short buffers, FFT reconstruction, bounded stationary-noise reduction, stereo coherence, isolated impulse repair and preservation of longer transients.

Browser verification in Chrome covered loading a WAV, setting gentle cleanup, playing clean/residual audio, exact master playback, WAV export and bypass. Synthetic checks do not replace listening tests on representative music.
