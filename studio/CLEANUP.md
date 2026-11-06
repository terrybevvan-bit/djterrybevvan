# Master Room restoration

Master Room is one continuous page: **Add your track → Choose your mastering preset → Clean up noise & artifacts → Listen → Export**. There are no editing tabs or rotary dials. Factory and saved presets remain available; automatic mastering, reference matching and waveform comparison are optional sections on the same page.

1. Choose a mastering preset, then a cleanup strength: **Off** (0/0/0), **Gentle** (30/25/25), **Balanced** (50/45/40), or **Strong** (75/65/60), in noise/shimmer/click percentages. The three ordinary sliders allow small cleanup adjustments. Stronger settings can remove more music; audition the residual.
2. Preview the cleaned audio, then the removed sound. Both play before mastering. Removed sound has an optional listening boost (enabled by default, capped at +24 dB), with original RMS level and applied boost displayed. This changes only the audition. Lower the cleanup settings if the residual contains musical detail you want to keep. Bypassed cleanup and negligible residuals show an explanation instead of a silent player.
3. Use the main player to hear the complete master. It automatically uses the same rendering path as export, before output encoding. Adjusting a cleanup slider pauses the main player; press play to render the new settings. No preview-mode checkbox is needed.
4. Export as usual. Restoration runs before the mastering chain for comparisons, WAV/MP3 exports and batch exports. It does not modify the source file.

All restoration controls default to bypass. Switching a factory mastering preset preserves the chosen cleanup settings. Custom presets save the complete mastering and cleanup combination; older custom presets load with cleanup bypassed. Existing browser storage keys are unchanged.

## Processing

An independent local Web Worker uses a 2048-sample Hann window, a 512-sample hop, FFT spectral attenuation and normalized overlap-add reconstruction. Up to approximately 500 frames across the track are sampled; digital silence and fades more than 50 dB below the loudest sampled frame are excluded, then the quietest 12% of remaining frames estimate the noise power spectrum. One gain mask is shared across channels, smoothed in frequency and time, and limited to 7 dB attenuation per frequency. Original phase, sample rate, channel count, length and sample alignment are preserved by the cleanup stage.

Noise reduction applies across the spectrum. Shimmer reduction adds attenuation above 4.5 kHz, reaching full strength at 7 kHz. Isolated click repair interpolates single-sample outliers when both neighbours agree; it deliberately avoids broader transients. Removed sound is the original minus the complete cleanup result, including click repair. Listening boost uses one gain across all channels, capped at +24 dB with a -12 dBFS target peak. Already loud residuals stay at unity gain. Near-zero numerical residue is not amplified.

The preset-driven De-fizz stage applies a high shelf above 6.5 kHz, up to a 7 dB cut. It replaces the previous subtraction of a phase-shifted, compressed branch. Selective noise reduction is handled by the cleanup section. Preset parameters remain intact in the processing engine, without manual EQ/dynamics dials in the interface.

## Limits

This is signal processing, not a trained source-separation model. It cannot reconstruct missing information, undo sustained clipping, remove all generated vocal artifacts or reliably distinguish hiss from cymbals. The automatic profile can mistake quiet instruments for noise. Start gently and audition the residual. Silent parts of the track remain silent even with audition boost; seek into the song. The 7 dB limit applies to spectral attenuation, not isolated click repair or the downstream mastering chain. Long tracks take time and memory; cleanup settings are cached per loaded source and parameter set.

Conceptual reference inspected: https://musiccleanerpro.musictechtools.xyz/ (Music Cleanup Pro v2). Implementation is original; no runtime dependency on that site.

## Verification

Run `npm test` with Node.js. Tests cover bypass, silence/short buffers, FFT reconstruction, bounded stationary-noise reduction, stereo coherence, isolated impulse repair and preservation of longer transients.

Studio asset URL checks cover `/studio`, `/studio/` and `/studio/index.html`. Styles, scripts and audio workers use `/studio/` paths so a missing trailing slash cannot break cleanup previews or MP3 exports.

Browser verification in Chrome covered loading a WAV, setting gentle cleanup, playing clean/residual audio, exact master playback, WAV export and bypass. Synthetic checks do not replace listening tests on representative music.
