export interface VideoViewProps {
  url: string;
}

export function VideoView({ url }: VideoViewProps) {
  return (
    <div className="asset-view mod-video">
      {/* biome-ignore lint/a11y/useMediaCaption: Vault video files do not necessarily ship caption tracks. */}
      <video src={url} controls />
    </div>
  );
}
