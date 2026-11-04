import type { Page, Route } from "@playwright/test";
import type {
  PostResponseDto,
  CommentResponseDto,
} from "../../src/features/social/types";
import { profile } from "./fixtures";

export const peer = {
  ...profile,
  user_id: 202,
  full_name: "Trần Hoàng Nam",
  email: "banhoc@example.test",
  bio: "Cùng tìm lời giải cho những câu hỏi hay.",
};
const authors = {
  101: { user_id: 101, full_name: profile.full_name },
  202: { user_id: 202, full_name: peer.full_name },
};
const success = (data: unknown) => ({ code: "1000", message: "SUCCESS", data });
const timestamp = "2026-10-27T03:00:00Z";
export function socialState() {
  return {
    posts: new Map<number, PostResponseDto>([
      [
        10,
        {
          post_id: 10,
          author: authors[202],
          content: "Cùng thảo luận về cấu trúc dữ liệu nhé!",
          visibility: "PUBLIC",
          post_type: "SOCIAL_POST",
          created_at: timestamp,
          media_urls: [],
        },
      ],
      [
        11,
        {
          post_id: 11,
          author: authors[202],
          content: "Một góc nhìn mới về thuật toán đồ thị.",
          visibility: "PUBLIC",
          post_type: "SOCIAL_POST",
          created_at: timestamp,
          media_urls: [],
        },
      ],
    ]),
    comments: new Map<number, CommentResponseDto>(),
    reactions: new Map<string, string>(),
    requests: new Map<number, "PENDING" | "ACCEPTED" | "DECLINED">(),
    friends: false,
    following: new Set<number>(), // Each ID identifies the follower in this isolated pair.
    blocked: new Set<number>(),
    nextPost: 100,
    nextComment: 1000,
    operations: [] as string[],
  };
}
export type SocialState = ReturnType<typeof socialState>;

export async function installSocialMock(
  page: Page,
  state: SocialState,
  viewer: 101 | 202 = 101,
) {
  const other = viewer === 101 ? 202 : 101;
  const current = viewer === 101 ? profile : peer;
  const person = other === 101 ? profile : peer;
  const denied = (route: Route, status = 403) =>
    route.fulfill({
      status,
      json: { code: "ACCESS_DENIED", message: "Không được phép" },
    });
  const allowed = (post: PostResponseDto) =>
    post.author?.user_id === viewer ||
    (!state.blocked.has(viewer) &&
      !state.blocked.has(other) &&
      (post.visibility === "PUBLIC" ||
        (post.visibility === "FRIENDS" && state.friends)));
  const present = (post: PostResponseDto) => ({
    ...post,
    react_count: [...state.reactions.keys()].filter((key) =>
      key.startsWith(`${post.post_id}:`),
    ).length,
    reacted_by_me: state.reactions.has(`${post.post_id}:${viewer}`),
    comment_count: [...state.comments.values()].filter(
      (comment) => comment.target_id === post.post_id && !comment.deleted,
    ).length,
  });
  function cursorPage<T>(
    items: T[],
    after: string | null,
    key: (item: T) => number,
  ) {
    const index = after
      ? items.findIndex((item) => key(item) === Number(after)) + 1
      : 0;
    const selected = items.slice(index, index + 1);
    return {
      items: selected,
      pagination: {
        has_next: index + 1 < items.length,
        after: selected.length ? key(selected[0]) : undefined,
      },
    };
  }
  const list = (items: unknown[]) => ({
    items,
    pagination: { has_next: false },
  });
  await page.route("**/mock-media/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC",
        "base64",
      ),
    }),
  );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = request.method();
    if (path.startsWith("/ws"))
      return route.fulfill({ status: 503, body: "Offline UI mock" });
    if (path === "/notifications")
      return route.fulfill({
        json: success({
          items: [],
          unread_count: 0,
          pagination: { has_next: false },
        }),
      });
    if (path === "/search/saved")
      return route.fulfill({
        json: success({ saved_searches: [], trending_searches: [] }),
      });
    if (path === "/activity-feeds/new-count")
      return route.fulfill({ json: success({ new_count: 0 }) });
    const body = () => request.postDataJSON();
    state.operations.push(`${method} ${path}`);
    const reply = (data: unknown) => route.fulfill({ json: success(data) });
    if (path === "/auth/login")
      return reply({
        access_token: `mock-social-${viewer}`,
        refresh_token: null,
        user_id: viewer,
        role: "STUDENT",
      });
    if (path === "/auth/logout") return reply(null);
    if (path === "/users/me" && method === "GET") return reply(current);
    if (path === "/activity-feeds") {
      const items = [...state.posts.values()].filter(allowed).map((post) => ({
        feed_id: post.post_id! + 900,
        target_type: "POST",
        target_id: post.post_id,
        action_type: "CREATED_POST",
        actor: post.author,
        created_at: timestamp,
      }));
      return reply(
        cursorPage(
          items,
          url.searchParams.get("after"),
          (item) => item.feed_id,
        ),
      );
    }
    if (path === "/posts" && method === "POST") {
      const payload = body();
      const id = state.nextPost++;
      state.posts.set(id, {
        ...payload,
        post_id: id,
        author: authors[viewer],
        created_at: timestamp,
      });
      return reply(present(state.posts.get(id)!));
    }
    if (path === "/posts/me")
      return reply(
        cursorPage(
          [...state.posts.values()]
            .filter((post) => post.author?.user_id === viewer)
            .map(present),
          url.searchParams.get("after"),
          (post) => post.post_id!,
        ),
      );
    const postMatch = path.match(/^\/posts\/(\d+)$/);
    if (postMatch) {
      const id = Number(postMatch[1]);
      const post = state.posts.get(id);
      if (!post) return denied(route, 404);
      if (method === "GET")
        return allowed(post) ? reply(present(post)) : denied(route);
      if (post.author?.user_id !== viewer) return denied(route);
      if (method === "PUT") {
        state.posts.set(id, { ...post, ...body(), updated_at: timestamp });
        return reply({ post_id: id, updated_at: timestamp });
      }
      if (method === "DELETE") {
        state.posts.delete(id);
        return reply({ post_id: id });
      }
    }
    if (path === "/comments" && method === "GET") {
      const parent = url.searchParams.get("parent_comment_id");
      const post = Number(url.searchParams.get("target_id"));
      let comments = [...state.comments.values()].filter(
        (comment) =>
          comment.target_id === post &&
          (parent
            ? comment.parent_comment_id === Number(parent)
            : !comment.parent_comment_id),
      );
      if (url.searchParams.get("sort") === "newest")
        comments = comments.reverse();
      return reply(
        cursorPage(
          comments,
          url.searchParams.get("after"),
          (comment) => comment.comment_id!,
        ),
      );
    }
    if (path === "/comments" && method === "POST") {
      const payload = body();
      const id = state.nextComment++;
      const comment = {
        ...payload,
        comment_id: id,
        author: authors[viewer],
        created_at: timestamp,
        deleted: false,
        reply_count: 0,
      };
      state.comments.set(id, comment);
      const parent = state.comments.get(payload.parent_comment_id);
      if (parent) parent.reply_count = (parent.reply_count || 0) + 1;
      return reply(comment);
    }
    const commentMatch = path.match(/^\/comments\/(\d+)$/);
    if (commentMatch) {
      const comment = state.comments.get(Number(commentMatch[1]));
      if (!comment) return denied(route, 404);
      if (comment.author?.user_id !== viewer) return denied(route);
      if (method === "PUT") {
        Object.assign(comment, body());
        return reply(comment);
      }
      if (method === "DELETE") {
        comment.deleted = true;
        return reply(null);
      }
    }
    if (path === "/react") {
      const payload = body();
      const key = `${payload.target_id}:${viewer}`;
      if (state.reactions.get(key) === payload.reaction_type)
        state.reactions.delete(key);
      else state.reactions.set(key, payload.reaction_type);
      const reaction_counts = { LIKE: 0, LOVE: 0, WOW: 0 };
      for (const [entry, reaction] of state.reactions)
        if (entry.startsWith(`${payload.target_id}:`))
          reaction_counts[reaction as keyof typeof reaction_counts]++;
      return reply({
        my_reaction: state.reactions.get(key) || null,
        reaction_counts,
        total_count: Object.values(reaction_counts).reduce(
          (sum, count) => sum + count,
          0,
        ),
      });
    }
    const userMatch = path.match(
      /^\/users\/(\d+)(\/relationship-stats|\/posts)?$/,
    );
    if (userMatch) {
      const id = Number(userMatch[1]);
      if (id !== 101 && id !== 202) return denied(route, 404);
      if (userMatch[2] === "/relationship-stats")
        return reply({
          user_id: id,
          counts: {
            friends_count: state.friends ? 1 : 0,
            followers_count: state.following.has(viewer) ? 1 : 0,
            following_count: state.following.has(other) ? 1 : 0,
          },
          relationship_with_me: {
            friend: state.friends,
            friend_request_status: state.friends
              ? "ACCEPTED"
              : state.requests.get(viewer) === "PENDING" ||
                  state.requests.get(other) === "PENDING"
                ? "PENDING"
                : "NONE",
            blocked: state.blocked.has(viewer),
            following: state.following.has(viewer),
            followed_by: state.following.has(other),
          },
        });
      if (userMatch[2] === "/posts") {
        if (state.blocked.has(viewer) || state.blocked.has(other))
          return denied(route);
        return reply(
          cursorPage(
            [...state.posts.values()]
              .filter((post) => post.author?.user_id === id && allowed(post))
              .map(present),
            url.searchParams.get("after"),
            (post) => post.post_id!,
          ),
        );
      }
      const {
        email: _email,
        date_of_birth: _dob,
        ...publicProfile
      } = id === 101 ? profile : peer;
      return reply(publicProfile);
    }
    if (path === "/friendships/request") {
      if (state.requests.get(other) === "PENDING") {
        state.friends = true;
        state.requests.set(other, "ACCEPTED");
      } else state.requests.set(viewer, "PENDING");
      return reply({
        requester_id: viewer,
        addressee_id: other,
        status: state.friends ? "ACCEPTED" : "PENDING",
      });
    }
    if (path === "/friendships/accept") {
      state.friends = true;
      state.requests.set(other, "ACCEPTED");
      return reply({
        requester_id: other,
        addressee_id: viewer,
        status: "ACCEPTED",
      });
    }
    if (path === "/friendships/decline") {
      state.requests.set(other, "DECLINED");
      return reply({
        requester_id: other,
        addressee_id: viewer,
        status: "DECLINED",
      });
    }
    if (path === "/friendships/requests/received")
      return reply(
        list(
          state.requests.get(other) === "PENDING"
            ? [
                {
                  requester: authors[other],
                  status: "PENDING",
                  created_at: timestamp,
                },
              ]
            : [],
        ),
      );
    if (path === "/friendships/requests/sent")
      return reply(
        list(
          state.requests.get(viewer) === "PENDING"
            ? [
                {
                  receiver: authors[other],
                  status: "PENDING",
                  created_at: timestamp,
                },
              ]
            : [],
        ),
      );
    if (path === "/friendships")
      return reply(list(state.friends ? [authors[other]] : []));
    if (/^\/friendships\/\d+$/.test(path) && method === "DELETE") {
      state.friends = false;
      state.requests.clear();
      return reply(null);
    }
    if (path === "/follows/following")
      return reply(list(state.following.has(viewer) ? [authors[other]] : []));
    if (path === "/follows/followers")
      return reply(list(state.following.has(other) ? [authors[other]] : []));
    if (/^\/follows\/\d+$/.test(path)) {
      if (method === "POST") state.following.add(viewer);
      else state.following.delete(viewer);
      return reply({
        target_user_id: other,
        following: method === "POST",
        new_followers_count: method === "POST" ? 1 : 0,
      });
    }
    if (path === "/blocks")
      return reply(list(state.blocked.has(viewer) ? [authors[other]] : []));
    if (/^\/blocks\/\d+$/.test(path)) {
      if (method === "POST") {
        state.blocked.add(viewer);
        state.friends = false;
        state.requests.clear();
        state.following.clear();
        return reply({ blocked_user_id: other, blocked: true });
      }
      state.blocked.delete(viewer);
      return reply({ unblocked_user_id: other, blocked: false });
    }
    if (path === "/search") {
      const type = url.searchParams.get("type");
      const term = (url.searchParams.get("query") || "").toLocaleLowerCase(
        "vi",
      );
      const items =
        type === "USER"
          ? person.full_name.toLocaleLowerCase("vi").includes(term)
            ? [{ type: "USER", user: person }]
            : []
          : [...state.posts.values()]
              .filter(
                (post) =>
                  allowed(post) &&
                  post.content?.toLocaleLowerCase("vi").includes(term),
              )
              .map((post) => ({
                type: "POST",
                post: {
                  post_id: post.post_id,
                  content: post.content,
                  author_id: post.author?.user_id,
                  author_name: post.author?.full_name,
                  react_count: present(post).react_count,
                  comment_count: present(post).comment_count,
                  created_at: post.created_at,
                },
              }));
      const offset = Number(url.searchParams.get("after") || 0);
      return reply({
        items: items.slice(offset, offset + 1),
        total_hits: items.length,
        pagination: { has_next: offset + 1 < items.length, after: offset + 1 },
      });
    }
    if (path === "/medias/upload")
      return reply({
        object_key: "test/photo.png",
        url: "http://127.0.0.1:4173/mock-media/photo.png",
        media_type: "IMAGE",
        content_type: "image/png",
        file_size: 68,
      });
    throw new Error(`Unmocked social request: ${method} ${path}`);
  });
}

// BrowserRouter responds to history navigation without reloading the memory-only session.
export async function goTo(page: Page, path: string) {
  await page.evaluate((destination) => {
    window.history.pushState({}, "", destination);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
