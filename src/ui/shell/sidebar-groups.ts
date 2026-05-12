export interface SidebarGroupState<T extends string> {
  readonly id: string;
  readonly active: T;
}

export function setSidebarGroupActive<T extends string>(
  groups: ReadonlyArray<SidebarGroupState<T>>,
  groupId: string,
  active: T,
): ReadonlyArray<SidebarGroupState<T>> {
  return groups.map((group) => (group.id === groupId ? { ...group, active } : group));
}

export function splitSidebarGroup<T extends string>(
  groups: ReadonlyArray<SidebarGroupState<T>>,
  groupId: string,
  nextId: string,
): ReadonlyArray<SidebarGroupState<T>> {
  const index = groups.findIndex((group) => group.id === groupId);
  if (index === -1) return groups;
  const source = groups[index];
  if (!source) return groups;
  return [
    ...groups.slice(0, index + 1),
    { id: nextId, active: source.active },
    ...groups.slice(index + 1),
  ];
}

export function closeSidebarGroup<T extends string>(
  groups: ReadonlyArray<SidebarGroupState<T>>,
  groupId: string,
): ReadonlyArray<SidebarGroupState<T>> {
  if (groups.length <= 1) return groups;
  const next = groups.filter((group) => group.id !== groupId);
  return next.length > 0 ? next : groups;
}
