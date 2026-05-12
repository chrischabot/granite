import type { BaseConfig } from "@core/bases/schema";
import type { VaultFile } from "@core/fs/types";
import { describe, expect, it } from "vitest";
import { collectMapPoints } from "./BasesMapView";
import type { Row } from "./shared";

const file: VaultFile = {
  type: "file",
  path: "Places/London.md",
  name: "London.md",
  size: 10,
  mtimeMs: 0,
  ctimeMs: 0,
  extension: "md",
};

const config: BaseConfig = {
  name: "Places",
  filter: "",
  columns: ["file.name", "latitude", "longitude"],
  sort: "file.name",
  sortOrder: "asc",
  view: "map",
  mapLatitude: "latitude",
  mapLongitude: "longitude",
  summaries: [],
  formulas: {},
};

function row(cells: Record<string, unknown>): Row {
  return { file, cells };
}

describe("BasesMapView", () => {
  it("projects valid latitude/longitude cells to map percentages", () => {
    const [point] = collectMapPoints([row({ latitude: 51.5, longitude: "-0.1" })], config);

    expect(point?.lat).toBe(51.5);
    expect(point?.lng).toBe(-0.1);
    expect(point?.xPct).toBeCloseTo(49.97, 1);
    expect(point?.yPct).toBeCloseTo(21.39, 1);
  });

  it("drops rows with missing or out-of-range coordinates", () => {
    const points = collectMapPoints(
      [
        row({ latitude: null, longitude: 0 }),
        row({ latitude: 91, longitude: 0 }),
        row({ latitude: 0, longitude: -181 }),
        row({ latitude: "not-a-number", longitude: 0 }),
      ],
      config,
    );

    expect(points).toEqual([]);
  });
});
