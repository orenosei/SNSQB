import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { Image } from "lucide-react";
import { imageUrl } from "../../components/Avatar";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorNotice } from "../../components/Feedback";
import { api, type ApiEnvelope, errorMessage, unwrap } from "../../lib/api";
import { formatTime, validId } from "../../lib/cursor";
import type { CursorPaginationDto } from "../social/types";
import { useRewardsPages } from "./api";
import { RewardResults, RewardsTabs } from "./RewardsPages";

type CosmeticType = "AVATAR_FRAME" | "CHAT_BUBBLE";
type Item = {
  cosmetic_id: number;
  name?: string;
  description?: string;
  asset_url?: string;
  type?: CosmeticType;
  rarity?: string;
  price?: number;
  owned?: boolean;
  available_until?: string;
};
type ShopPage = {
  items?: Item[];
  user_points?: number;
  pagination?: CursorPaginationDto;
};
type InventoryPage = {
  inventory?: Item[];
  summary?: { total_unlocked?: number; collection_completion_percent?: number };
  currently_equipped?: Record<
    string,
    { cosmetic_id?: number; name?: string } | null
  >;
  pagination?: CursorPaginationDto;
};

const typeNames: Record<CosmeticType, string> = {
  AVATAR_FRAME: "Khung ảnh đại diện",
  CHAT_BUBBLE: "Bong bóng chat",
};
const rarities: Record<string, string> = {
  COMMON: "Phổ thông",
  RARE: "Hiếm",
  EPIC: "Sử thi",
  LEGENDARY: "Huyền thoại",
};

function CosmeticCatalog({ inventory }: { inventory: boolean }) {
  const [type, setType] = useState("");
  const [buying, setBuying] = useState<Item>();
  const client = useQueryClient();
  const shopPath = "/cosmetics/shop";
  const inventoryPath = "/cosmetics/my-inventory";
  const query = useRewardsPages<ShopPage & InventoryPage>(
    inventory ? inventoryPath : shopPath,
    { type: type || undefined },
  );
  const pages = query.data?.pages || [];
  const first = pages[0];
  const items = pages.flatMap(
    (page) => (inventory ? page.inventory : page.items) || [],
  );
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["rewards", shopPath] }),
      client.invalidateQueries({ queryKey: ["rewards", inventoryPath] }),
      client.invalidateQueries({ queryKey: ["profile"] }),
      client.invalidateQueries({ queryKey: ["people", "profile"] }),
    ]);
  const change = useMutation({
    mutationFn: async ({
      action,
      id,
    }: {
      action: "buy" | "equip" | "unequip";
      id: number;
    }) =>
      unwrap(
        action === "buy"
          ? await api.post<ApiEnvelope<unknown>>(`/cosmetics/${id}/buy`)
          : await api.put<ApiEnvelope<unknown>>(`/cosmetics/${action}`, {
              cosmetic_id: id,
            }),
      ),
    onSuccess: async () => {
      setBuying(undefined);
      await refresh();
    },
    onError: () => {
      void refresh();
    },
  });
  return (
    <>
      <label className="rewards-filter">
        Loại vật phẩm
        <select
          value={type}
          disabled={change.isPending}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">Tất cả</option>
          {Object.entries(typeNames).map(([key, name]) => (
            <option value={key} key={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {inventory
        ? first && (
            <section className="surface rewards-panel">
              <h2>Bộ sưu tập</h2>
              {first.summary?.total_unlocked != null && (
                <p>{first.summary.total_unlocked} vật phẩm đã mở khóa</p>
              )}
              {first.summary?.collection_completion_percent != null && (
                <p>Đã sưu tập {first.summary.collection_completion_percent}%</p>
              )}
              {Object.entries(typeNames).map(([slot, label]) => (
                <p key={slot}>
                  {label} ·{" "}
                  {first.currently_equipped?.[slot]?.name || "Mặc định"}
                </p>
              ))}
            </section>
          )
        : first?.user_points != null && (
            <p className="surface rewards-panel">
              Số dư <strong>{first.user_points} xu</strong>
            </p>
          )}
      {change.isSuccess && (
        <p role="status">
          {change.variables?.action === "buy"
            ? "Đã mua vật phẩm."
            : change.variables?.action === "equip"
              ? "Đã trang bị vật phẩm."
              : "Đã tháo vật phẩm."}
        </p>
      )}
      {change.isError && !buying && (
        <ErrorNotice message={errorMessage(change.error)} />
      )}
      <RewardResults
        query={query}
        empty={
          inventory
            ? "Kho chưa có vật phẩm phù hợp"
            : "Chưa có vật phẩm phù hợp"
        }
      >
        {!!items.length && (
          <div className="rewards-grid">
            {items.map((item) => {
              const image = imageUrl(item.asset_url);
              const equipped =
                item.type != null &&
                first?.currently_equipped?.[item.type]?.cosmetic_id ===
                  item.cosmetic_id;
              const expires = item.available_until
                ? Date.parse(item.available_until)
                : NaN;
              const expired = expires <= Date.now();
              const canBuy =
                validId(item.cosmetic_id) &&
                item.price != null &&
                !item.owned &&
                !expired &&
                (first?.user_points == null || first.user_points >= item.price);
              return (
                <article
                  className="surface rewards-panel cosmetic-card"
                  key={item.cosmetic_id}
                >
                  <div className="cosmetic-preview">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Image size={32} aria-hidden="true" />
                    )}
                  </div>
                  <h2>{item.name || "Vật phẩm"}</h2>
                  <p className="muted">
                    {[
                      item.type && typeNames[item.type],
                      item.rarity && (rarities[item.rarity] || item.rarity),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {item.description && <p>{item.description}</p>}
                  {item.available_until && (
                    <p>
                      {inventory ? "Hạn sở hữu" : "Mở bán đến"} ·{" "}
                      {formatTime(item.available_until)}
                    </p>
                  )}
                  {inventory ? (
                    <button
                      className="button button-secondary"
                      disabled={
                        change.isPending ||
                        !validId(item.cosmetic_id) ||
                        !item.type ||
                        (expired && !equipped)
                      }
                      onClick={() =>
                        change.mutate({
                          action: equipped ? "unequip" : "equip",
                          id: item.cosmetic_id,
                        })
                      }
                    >
                      {equipped ? "Tháo vật phẩm" : "Trang bị"}
                    </button>
                  ) : (
                    <button
                      className="button button-primary"
                      disabled={!canBuy || change.isPending}
                      onClick={() => {
                        change.reset();
                        setBuying(item);
                      }}
                    >
                      {item.owned
                        ? "Đã sở hữu"
                        : expired
                          ? "Đã hết hạn"
                          : item.price == null
                            ? "Chưa có giá"
                            : `Mua · ${item.price} xu`}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </RewardResults>
      {buying && (
        <ConfirmDialog
          title="Mua vật phẩm"
          description={`Dùng ${buying.price} xu để mua ${buying.name || "vật phẩm này"}.`}
          confirmLabel="Xác nhận mua"
          pending={change.isPending}
          error={change.isError ? errorMessage(change.error) : undefined}
          onConfirm={() =>
            change.mutate({ action: "buy", id: buying.cosmetic_id })
          }
          onClose={() => {
            change.reset();
            setBuying(undefined);
          }}
        />
      )}
    </>
  );
}

export function CosmeticsPage() {
  const [params] = useSearchParams();
  const inventory = params.get("tab") === "inventory";
  return (
    <div className="social-page rewards-page">
      <h1>Vật phẩm trang trí</h1>
      <RewardsTabs
        tabs={[
          ["shop", "Cửa hàng"],
          ["inventory", "Kho của tôi"],
        ]}
        active={inventory ? "inventory" : "shop"}
        href="/cosmetics"
      />
      <CosmeticCatalog key={String(inventory)} inventory={inventory} />
    </div>
  );
}
