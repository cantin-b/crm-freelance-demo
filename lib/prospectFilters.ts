export function buildProspectWhere(params: URLSearchParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];

  const country = params.get("country");
  if (country) conditions.push({ country: { in: country.split(",") } });

  const category = params.get("category");
  if (category) conditions.push({ category: { in: category.split(",") } });

  const status = params.get("status");
  if (status) conditions.push({ status: { in: status.split(",") } });

  const hasEmail = params.get("hasEmail");
  if (hasEmail === "yes") {
    conditions.push({ email: { not: null } });
    conditions.push({ email: { not: "" } });
  } else if (hasEmail === "no") {
    conditions.push({ OR: [{ email: null }, { email: "" }] });
  }

  const hasWebsite = params.get("hasWebsite");
  if (hasWebsite === "yes") {
    conditions.push({ website: { not: null } });
    conditions.push({ website: { not: "" } });
  } else if (hasWebsite === "no") {
    conditions.push({ OR: [{ website: null }, { website: "" }] });
  }

  const listName = params.get("listName");
  if (listName) conditions.push({ list_name: listName });

  const search = params.get("search")?.trim();
  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search } },
        { city: { contains: search } },
        { owner: { contains: search } },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}
