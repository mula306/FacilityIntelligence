export function permissionMatches(granted: string, required: string): boolean {
  if (granted === required || granted === "platform:*") {
    return true;
  }

  const [grantedResource, grantedAction] = granted.split(":");
  const [requiredResource, requiredAction] = required.split(":");

  if (!grantedResource || !grantedAction || !requiredResource || !requiredAction) {
    return false;
  }

  if (grantedResource === requiredResource && grantedAction === "*") {
    return true;
  }

  return false;
}

export function hasPermission(grantedPermissions: string[], requiredPermission: string): boolean {
  return grantedPermissions.some((permission) => permissionMatches(permission, requiredPermission));
}
