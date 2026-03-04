export function toGroupKey(groupName: string): string {
  return `group:${groupName}`;
}

export function toSubgroupKey(groupName: string, subgroupName: string): string {
  return `subgroup:${groupName}/${subgroupName}`;
}

export function groupNameFromGroupKey(groupKey: string): string {
  return groupKey.replace(/^group:/, "");
}

export function parseSubgroupKey(subgroupKey: string): { group: string; subgroup: string } {
  const payload = subgroupKey.replace(/^subgroup:/, "");
  const [group, ...rest] = payload.split("/");
  return {
    group,
    subgroup: rest.join("/")
  };
}
