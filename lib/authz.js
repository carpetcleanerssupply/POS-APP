export function isOwnerManager(session) {
  return session.user.tier === "OWNER_MANAGER";
}

// For JSON API routes — pairs with requireSessionJson().
export function forbiddenJson(message = "You don't have permission to do that.") {
  return Response.json({ error: message }, { status: 403 });
}
