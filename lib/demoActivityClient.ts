export function recordDemoCall(prospectId: number) {
  void fetch("/api/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prospectId, type: "call" }),
  }).catch(() => {
    // Demo analytics should never block the contact action.
  });
}
