import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../index";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { encrypt, decrypt } from "../services/encryption";

const router = Router();

const GITHUB_API = "https://api.github.com";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

async function githubFetch(url: string, token: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "CollabRoom",
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const errBody: any = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errBody.message || `GitHub API error: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function getAccessToken(userId: string): Promise<string> {
  const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
  if (!account) throw new Error("GitHub account not connected");
  return decrypt(account.accessTokenEncrypted);
}

// GET /api/github/oauth/authorize — return OAuth authorize URL (call with auth header from frontend)
router.get("/oauth/authorize", authenticateToken, (req: AuthRequest, res: Response) => {
  const state = Buffer.from(JSON.stringify({ userId: req.userId!, ts: Date.now() })).toString("base64");
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/api/github/oauth/callback`,
    scope: "repo",
    state,
  });
  res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
});

// GET /api/github/oauth/callback — handle OAuth callback
router.get("/oauth/callback", async (req: AuthRequest, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/settings?github=error&message=missing_params`);
    }

    let stateData: { userId: string };
    try {
      stateData = JSON.parse(Buffer.from(state as string, "base64").toString());
    } catch {
      return res.redirect(`${FRONTEND_URL}/settings?github=error&message=invalid_state`);
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code as string,
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(`${FRONTEND_URL}/settings?github=error&message=token_exchange_failed`);
    }

    const userData: any = await githubFetch(`${GITHUB_API}/user`, tokenData.access_token);

    await prisma.gitHubAccount.upsert({
      where: { userId: stateData.userId },
      update: {
        githubId: userData.id,
        username: userData.login,
        avatarUrl: userData.avatar_url,
        accessTokenEncrypted: encrypt(tokenData.access_token),
      },
      create: {
        userId: stateData.userId,
        githubId: userData.id,
        username: userData.login,
        avatarUrl: userData.avatar_url,
        accessTokenEncrypted: encrypt(tokenData.access_token),
      },
    });

    res.redirect(`${FRONTEND_URL}/settings?github=success&username=${userData.login}`);
  } catch {
    res.redirect(`${FRONTEND_URL}/settings?github=error&message=callback_failed`);
  }
});

// GET /api/github/status — check if user has GitHub connected
router.get("/status", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const account = await prisma.gitHubAccount.findUnique({ where: { userId: req.userId! } });
    res.json({
      connected: !!account,
      username: account?.username || null,
      avatarUrl: account?.avatarUrl || null,
    });
  } catch {
    res.status(500).json({ error: "Failed to check GitHub status" });
  }
});

// DELETE /api/github/disconnect — remove GitHub connection
router.delete("/disconnect", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.gitHubAccount.deleteMany({ where: { userId: req.userId! } });
    res.json({ message: "GitHub account disconnected" });
  } catch {
    res.status(500).json({ error: "Failed to disconnect GitHub" });
  }
});

// GET /api/github/repos — list user's repos
router.get("/repos", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const token = await getAccessToken(req.userId!);
    const repos: any[] = await githubFetch(`${GITHUB_API}/user/repos?per_page=100&sort=updated`, token);
    res.json(
      repos.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        private: r.private,
        htmlUrl: r.html_url,
        defaultBranch: r.default_branch,
        owner: r.owner.login,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch repos" });
  }
});

// GET /api/github/repos/:owner/:repo/contents — get repo contents (root or path)
router.get("/repos/:owner/:repo/contents", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const token = await getAccessToken(req.userId!);
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    const path = (req.query.path as string) || "";
    const data: any = await githubFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      token
    );

    const items = Array.isArray(data) ? data : [data];
    res.json(
      items.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        sha: item.sha,
        downloadUrl: item.download_url,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch contents" });
  }
});

// GET /api/github/repos/:owner/:repo/file — fetch single file content + sha
router.get("/repos/:owner/:repo/file", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const token = await getAccessToken(req.userId!);
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    const path = req.query.path as string;
    if (!path) {
      return res.status(400).json({ error: "path query parameter required" });
    }

    const data: any = await githubFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      token
    );

    const content = Buffer.from(data.content, "base64").toString("utf8");
    res.json({
      name: data.name,
      path: data.path,
      sha: data.sha,
      size: data.size,
      content,
      htmlUrl: data.html_url,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch file" });
  }
});

// PUT /api/github/repos/:owner/:repo/contents — commit/update a file
router.put("/repos/:owner/:repo/contents", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const token = await getAccessToken(req.userId!);
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    const { path, message, content, sha } = req.body;

    if (!path || !message || !content) {
      return res.status(400).json({ error: "path, message, and content are required" });
    }

    const putBody: any = {
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
    };
    if (sha) putBody.sha = sha;

    const data: any = await githubFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      token,
      { method: "PUT", body: JSON.stringify(putBody) }
    );

    const commitInfo = {
      commitSha: data.content.sha,
      commitUrl: data.commit.html_url,
      file: data.content.path,
    };

    const fullName = `${owner}/${repo}`;
    const rooms: any[] = await prisma.room.findMany({
      where: { githubOwner: owner, githubRepo: repo },
      include: {
        members: {
          where: { status: "approved" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } });

    for (const room of rooms) {
      for (const member of room.members) {
        await prisma.notification.create({
          data: {
            userId: member.user.id,
            title: "Code committed",
            message: `${user?.name || "Someone"} committed "${message}" to ${fullName}/${path}`,
            type: "github_commit",
            roomId: room.id,
            metadata: JSON.stringify({
              repo: fullName,
              file: data.content.path,
              commitSha: data.content.sha,
              commitMessage: message,
              author: user?.name || "Unknown",
            }),
          },
        });
      }
    }

    res.json({ success: true, ...commitInfo });
  } catch (error: any) {
    const isConflict = error.message?.includes("409") || error.message?.includes("sha");
    res.status(isConflict ? 409 : 500).json({
      error: isConflict
        ? "File has been modified since last fetch. Please reload and try again."
        : error.message || "Failed to commit file",
    });
  }
});

// POST /api/github/repos/:owner/:repo/setup-webhook — create webhook for a room
router.post("/repos/:owner/:repo/setup-webhook", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const token = await getAccessToken(req.userId!);
    const owner = req.params.owner as string;
    const repo = req.params.repo as string;
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    const secret = crypto.randomBytes(20).toString("hex");
    const webhookUrl = `${BACKEND_URL}/api/github/webhook`;

    const data: any = await githubFetch(
      `${GITHUB_API}/repos/${owner}/${repo}/hooks`,
      token,
      {
        method: "POST",
        body: JSON.stringify({
          name: "web",
          active: true,
          events: ["push"],
          config: {
            url: webhookUrl,
            content_type: "json",
            secret,
          },
        }),
      }
    );

    await prisma.room.update({
      where: { roomId },
      data: {
        githubWebhookId: data.id,
        githubWebhookSecret: secret,
      },
    });

    res.json({ webhookId: data.id, message: "Webhook created" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create webhook" });
  }
});

// POST /api/github/webhook — receive push event webhooks from GitHub
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    const event = req.headers["x-github-event"] as string;

    if (!signature || event !== "push") {
      return res.status(200).json({ message: "ignored" });
    }

    const body: any = req.body;
    const fullName = body.repository?.full_name;
    if (!fullName) {
      return res.status(200).json({ message: "no repo" });
    }

    const [owner, repo] = fullName.split("/");
    const rooms: any[] = await prisma.room.findMany({
      where: {
        githubOwner: owner,
        githubRepo: repo,
        githubWebhookId: { not: null },
        githubWebhookSecret: { not: null },
      },
      include: {
        members: {
          where: { status: "approved" },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (rooms.length === 0) {
      return res.status(200).json({ message: "no connected rooms" });
    }

    const rawBody = (req as any).rawBody;

    for (const room of rooms) {
      const sig = crypto
        .createHmac("sha256", room.githubWebhookSecret)
        .update(rawBody)
        .digest("hex");
      const expectedSig = `sha256=${sig}`;

      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        const pusher = body.pusher?.name || "Someone";
        const ref = body.ref?.replace("refs/heads/", "") || "unknown";
        const commits = body.commits || [];

        for (const commit of commits.slice(0, 10)) {
          for (const member of room.members) {
            await prisma.notification.create({
              data: {
                userId: member.user.id,
                title: "External commit pushed",
                message: `${pusher} pushed "${commit.message?.split("\n")[0]}" to ${fullName}:${ref}`,
                type: "github_commit",
                roomId: room.id,
                metadata: JSON.stringify({
                  repo: fullName,
                  branch: ref,
                  commitSha: commit.id,
                  commitMessage: commit.message,
                  author: pusher,
                  external: true,
                }),
              },
            });
          }
        }
      }
    }

    res.status(200).json({ message: "ok" });
  } catch {
    res.status(200).json({ message: "error processing webhook" });
  }
});

export default router;
