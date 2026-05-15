import type { VaultPath } from "@core/fs/types";

export interface ImageViewProps {
  path: VaultPath;
  url: string;
}

export function ImageView({ path, url }: ImageViewProps) {
  return (
    <div className="asset-view mod-image">
      <img src={url} alt={path} />
    </div>
  );
}
