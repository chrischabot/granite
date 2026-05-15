export interface AudioViewProps {
  url: string;
}

export function AudioView({ url }: AudioViewProps) {
  return (
    <div className="asset-view mod-audio">
      {/* biome-ignore lint/a11y/useMediaCaption: Vault audio files do not necessarily ship caption tracks. */}
      <audio src={url} controls />
    </div>
  );
}
