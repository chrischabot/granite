import { useWorkspace } from "@core/workspace/useWorkspace";
import { workspaceStore } from "@core/workspace/store";
import { LeafBody } from "../workspace/Leaf";
import { TabStrip } from "../workspace/TabStrip";
import type { Leaf } from "@core/workspace/types";

export function Workspace() {
  const { columns, groups, leaves, activeGroupId } = useWorkspace();
  const totalGroups = columns.reduce((s, c) => s + c.length, 0);

  return (
    <div className="workspace">
      <div className="workspace-split mod-root mod-vertical">
        {columns.map((column, colIdx) => (
          <div
            key={`col-${colIdx}`}
            className="workspace-split mod-horizontal"
            style={{ position: "relative", flex: "1 1 0", display: "flex", flexDirection: "column" }}
          >
            {colIdx > 0 && (
              <div
                className="workspace-leaf-resize-handle"
                style={{ position: "absolute", left: 0, top: 0, height: "100%" }}
              />
            )}
            {column.map((gid, rowIdx) => {
              const group = groups.get(gid);
              if (!group) return null;
              const groupLeaves: Leaf[] = group.leafIds
                .map((id) => leaves.get(id))
                .filter((l): l is Leaf => !!l);
              const activeLeaf = group.activeLeafId ? leaves.get(group.activeLeafId) : null;
              const isActiveGroup = activeGroupId === gid;
              const stacked = !!group.stacked;
              return (
                <div
                  key={gid}
                  className={`workspace-tabs mod-top${isActiveGroup ? " mod-active" : ""}${stacked ? " mod-stacked" : ""}`}
                  onMouseDown={() => {
                    if (group.activeLeafId) workspaceStore.focusTab(group.activeLeafId);
                  }}
                  style={{ position: "relative", flex: "1 1 0", minHeight: 0 }}
                >
                  {rowIdx > 0 && (
                    <div
                      className="workspace-leaf-resize-handle"
                      style={{ position: "absolute", left: 0, right: 0, top: 0, width: "100%", height: 3, cursor: "row-resize" }}
                    />
                  )}
                  <TabStrip
                    leaves={groupLeaves}
                    activeLeafId={group.activeLeafId}
                    groupId={gid}
                    canCloseGroup={totalGroups > 1}
                    stacked={stacked}
                  />
                  <div className="workspace-tab-container">
                    {activeLeaf && (
                      <LeafBody leaf={activeLeaf} groupId={gid} isActiveGroup={isActiveGroup} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}