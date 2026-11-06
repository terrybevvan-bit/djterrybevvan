export type SavedCreatorTrack = {
  id?: string; savedAt?: number; source: 'song-creator'; hasSong: boolean;
  title: string; lyrics: string; style: string; cover: string; concept: string;
  genre: string; genreKey: string; introBars: 16 | 32;
};
declare global {
  interface Window {
    TrackStore: {
      save(track: SavedCreatorTrack): string;
      get(id: string): SavedCreatorTrack | undefined;
    };
    StudioSession: {
      getKey(): string; setKey(key: string): void;
      subscribe(listener: () => void): () => void;
    };
    pendingSongCreatorTrack?: SavedCreatorTrack;
    loadSongCreatorTrack?: (track: SavedCreatorTrack) => void;
  }
}
