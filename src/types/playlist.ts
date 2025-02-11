export interface Track {
    id: string;
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
}

export interface Playlist {
    id: string;
    name: string;
    trackCount: number;
    thumbnail: string;
}