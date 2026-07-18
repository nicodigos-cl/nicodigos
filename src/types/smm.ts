/** Generic SMM panel API v2 types (PerfectSMM-compatible). */

export type SmmServiceItem = {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
};

export type SmmAddOrderResponse = {
  order: number;
};

export type SmmOrderStatus = {
  charge: string;
  start_count: string;
  status: string;
  remains: string;
  currency: string;
};

export type SmmOrderStatusError = {
  error: string;
};

export type SmmMultiStatusResponse = Record<
  string,
  SmmOrderStatus | SmmOrderStatusError
>;

export type SmmRefillResponse = {
  refill: string | number;
};

export type SmmMultiRefillItem =
  | { order: number; refill: number }
  | { order: number; refill: { error: string } };

export type SmmRefillStatusResponse = {
  status: string;
};

export type SmmMultiRefillStatusItem =
  | { refill: number; status: string }
  | { refill: number; status: { error: string } };

export type SmmCancelItem =
  | { order: number; cancel: number }
  | { order: number; cancel: { error: string } };

export type SmmBalance = {
  balance: string;
  currency: string;
};

export type SmmApiErrorBody = {
  error: string;
};

type OrderBase = {
  service: number;
};

/** Default / drip-feed order. */
export type SmmDefaultOrder = OrderBase & {
  link: string;
  quantity: number;
  runs?: number;
  interval?: number;
};

/** Fixed package (no quantity). */
export type SmmPackageOrder = OrderBase & {
  link: string;
};

/** Custom comments list. */
export type SmmCustomCommentsOrder = OrderBase & {
  link: string;
  comments: string;
};

/** Mentions with hashtags. */
export type SmmMentionsHashtagsOrder = OrderBase & {
  link: string;
  quantity: number;
  usernames: string;
  hashtags: string;
};

/** Mentions custom username list. */
export type SmmMentionsCustomListOrder = OrderBase & {
  link: string;
  usernames: string;
};

/** Mentions scraped from a user's followers. */
export type SmmMentionsUserFollowersOrder = OrderBase & {
  link: string;
  quantity: number;
  username: string;
};

/** Mentions scraped from media likers. */
export type SmmMentionsMediaLikersOrder = OrderBase & {
  link: string;
  quantity: number;
  media: string;
};

export type SmmSubscriptionDelay =
  | 0
  | 5
  | 10
  | 15
  | 20
  | 30
  | 40
  | 50
  | 60
  | 90
  | 120
  | 150
  | 180
  | 210
  | 240
  | 270
  | 300
  | 360
  | 420
  | 480
  | 540
  | 600;

/** Auto-subscription for new/old posts. */
export type SmmSubscriptionOrder = OrderBase & {
  username: string;
  min: number;
  max: number;
  delay: SmmSubscriptionDelay;
  posts?: number;
  old_posts?: number;
  expiry?: string;
};

/** Comment likes. */
export type SmmCommentLikesOrder = OrderBase & {
  link: string;
  quantity: number;
  username: string;
};

/** Poll votes. */
export type SmmPollOrder = OrderBase & {
  link: string;
  quantity: number;
  answer_number: string | number;
};

export type SmmOrderPayload =
  | SmmDefaultOrder
  | SmmPackageOrder
  | SmmCustomCommentsOrder
  | SmmMentionsHashtagsOrder
  | SmmMentionsCustomListOrder
  | SmmMentionsUserFollowersOrder
  | SmmMentionsMediaLikersOrder
  | SmmSubscriptionOrder
  | SmmCommentLikesOrder
  | SmmPollOrder;
