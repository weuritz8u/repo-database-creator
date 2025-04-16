import { NextResponse } from "next/server";

interface Repository {
  id: number;
  name: string;
  html_url: string;
  language: string | null;
  description: string | null;
}

function csvEscape(value: string) {
  const needsQuotes = /[",\n\r]/.test(value);
  if (needsQuotes) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user") || "shadowdara";
  const raw = searchParams.get("raw") || "true";
  const includeDescription = searchParams.get("description") || "true";
  const includeLanguage = searchParams.get("language") || "true";
  const show_user = searchParams.get("show_user") || "false";
  const show_link = searchParams.get("link") || "false";

  if (raw === "false") {
    const redirectUrl = new URL("/api/repos", request.url);
    redirectUrl.search = searchParams.toString();

    return NextResponse.redirect(redirectUrl.toString(), 302);
  }

  // GitHub API für Repositories
  const apiRes = await fetch(`https://api.github.com/users/${user}/repos`, {
    headers: { Accept: "application/vnd.github.v3+json" },
    next: { revalidate: 60000 }, // Cache und Revalidate alle 60.000 Sekunden
    cache: "force-cache",
  });

  if (!apiRes.ok) {
    return new NextResponse("Error fetching repos", { status: apiRes.status });
  }

  const repos: Repository[] = await apiRes.json();

  const includeUser = show_user === 'true';
  const includeLang = includeLanguage === 'true';
  const includeDesc = includeDescription === 'true';
  const includeLink = show_link === 'true';
  
  const csvLines = [
    // Dynamischer Header
    [
      "Name",
      ...(includeUser ? ["Username"] : []),
      ...(includeLang ? ["Language"] : []),
      ...(includeDesc ? ["Description"] : []),
      ...(includeLink ? ["Link"] : [])
    ].join(","),
  
    // Repos
    ...repos.map((r) => {
      const name = csvEscape(r.name);
      const lang = csvEscape(r.language || "-");
      const desc = csvEscape(r.description || "-");
      const linkc = csvEscape(r.html_url);
  
      return [
        name,
        ...(includeLang ? [lang] : []),
        ...(includeUser ? [user] : []),
        ...(includeDesc ? [desc] : []),
        ...(includeLink ? [linkc] : []),
      ].join(",");
    }),
  ];
  
  

  const response = new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      //"Content-Disposition": `attachment; filename="${user}_repos.csv"`,
    },
  });

  return response;
}
