// Contract fields from docs/source/openapi.json. Do not add undocumented response fields.

export interface Relationship {
  is_friend?: boolean;
  is_following?: boolean;
  is_followed?: boolean;
  friend_request_status?: "NONE" | "PENDING" | "ACCEPTED" | "DECLINED";
}

export interface ProfileResponse {
  user_id?: number;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  cover_url?: string;
  frame_url?: string;
  gender?: "MALE" | "FEMALE";
  date_of_birth?: string;
  bio?: string;
  school_faculty?: string;
  major?: string;
  class_name?: string;
  student_lecturer_code?: string;
  role?: "ADMIN" | "LECTURER" | "STUDENT";
  timezone?: string;
  profile_completed?: boolean;
  verified?: boolean;
  total_proposed_questions?: number;
  gamification_points?: number;
  badges_count?: number;
  friends_count?: number;
  followers_count?: number;
  following_count?: number;
  created_at?: string;
  relationships?: Relationship;
}

export interface AuthorDto {
  user_id?: number;
  full_name?: string;
  avatar_url?: string;
  frame_url?: string;
}

export interface ActivityFeedItemDto {
  feed_id?: number;
  target_type?:
    | "POST"
    | "QUESTION"
    | "SESSION"
    | "BADGE"
    | "COSMETIC"
    | "USER"
    | "SUBJECT";
  target_id?: number;
  action_type?:
    | "CREATED_POST"
    | "PUBLISHED_LECTURE_VIDEO"
    | "SESSION_RESOLVED_APPROVED"
    | "EARNED_BADGE"
    | "REACHED_MILESTONE";
  actor?: AuthorDto;
  content?: Record<string, unknown>;
  created_at?: string;
  weight?: number;
}

export interface CursorPaginationDto {
  before?: number;
  after?: number;
  has_prev?: boolean;
  has_next?: boolean;
}

export interface MediaItem {
  key?: string;
  url?: string;
  type?: "IMAGE" | "VIDEO" | "DOCUMENT";
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  name?: string;
  thumbnail_url?: string;
}

export interface PostResponseDto {
  post_id?: number;
  content?: string;
  post_type?:
    | "LEARNING_VIDEO"
    | "SOCIAL_POST"
    | "QUESTION_APPROVED_NOTIFICATION"
    | "LEADERBOARD_HONOR";
  media_urls?: Array<MediaItem>;
  visibility?: "PUBLIC" | "ONLY_ME" | "FRIENDS";
  author?: AuthorDto;
  react_count?: number;
  comment_count?: number;
  reacted_by_me?: boolean;
  created_at?: string;
  updated_at?: string;
  lecturer_note?: string;
  lecturer_note_added_at?: string;
  noted_lecturer?: AuthorDto;
  subject_id?: number;
  subject_name?: string;
  subject_code?: string;
  session_id?: number;
}

export interface CreatePostRequest {
  content?: string;
  media_urls?: Array<MediaItem>;
  visibility: "PUBLIC" | "ONLY_ME" | "FRIENDS";
  subject_id?: number;
  post_type?:
    | "LEARNING_VIDEO"
    | "SOCIAL_POST"
    | "QUESTION_APPROVED_NOTIFICATION"
    | "LEADERBOARD_HONOR";
}

export interface UpdatePostRequest {
  content?: string;
  media_urls?: Array<MediaItem>;
  visibility: "PUBLIC" | "ONLY_ME" | "FRIENDS";
}

export interface UpdatePostResponseDto {
  post_id?: number;
  updated_at?: string;
}

export interface CommentResponseDto {
  comment_id?: number;
  target_type?: string;
  target_id?: number;
  parent_comment_id?: number;
  content?: string;
  media_url?: string;
  author?: AuthorDto;
  created_at?: string;
  deleted?: boolean;
  reply_count?: number;
  replies?: Array<CommentResponseDto>;
}

export interface CreateCommentRequest {
  target_type: "POST" | "SESSION" | "QUESTION";
  target_id: number;
  content?: string;
  parent_comment_id?: number;
  media_url?: string;
}

export interface UpdateCommentRequest {
  content?: string;
  media_url?: string;
}

export interface ReactRequest {
  target_type: "POST" | "SESSION" | "QUESTION";
  target_id: number;
  reaction_type: "LIKE" | "LOVE" | "WOW";
}

export interface ReactResponseDto {
  my_reaction?: string;
  reaction_counts?: Record<string, number>;
  total_count?: number;
}

export interface Counts {
  followers_count?: number;
  following_count?: number;
  friends_count?: number;
}

export interface RelationshipWithMe {
  friend_request_status?: "NONE" | "PENDING" | "ACCEPTED" | "DECLINED";
  friend?: boolean;
  blocked?: boolean;
  following?: boolean;
  followed_by?: boolean;
}

export interface RelationshipStatsResponseDto {
  user_id?: number;
  counts?: Counts;
  relationship_with_me?: RelationshipWithMe;
}

export interface FriendDto {
  user_id?: number;
  full_name?: string;
  avatar_url?: string;
  frame_url?: string;
  friends_since?: string;
  mutual_friends_count?: number;
}

export interface FriendListResponseDto {
  items?: Array<FriendDto>;
  pagination?: CursorPaginationDto;
  total_friends?: number;
}

export interface FriendRequestSentDto {
  receiver?: AuthorDto;
  status?: "NONE" | "PENDING" | "ACCEPTED" | "DECLINED";
  created_at?: string;
  mutual_friends_count?: number;
}

export interface FriendRequestSentListResponseDto {
  items?: Array<FriendRequestSentDto>;
  pagination?: CursorPaginationDto;
  total_sent?: number;
}

export interface FriendRequestReceivedDto {
  requester?: AuthorDto;
  status?: "NONE" | "PENDING" | "ACCEPTED" | "DECLINED";
  created_at?: string;
  mutual_friends_count?: number;
}

export interface FriendRequestReceivedListResponseDto {
  items?: Array<FriendRequestReceivedDto>;
  pagination?: CursorPaginationDto;
  total_pending?: number;
}

export interface SendFriendRequestDto {
  addressee_id: number;
}

export interface AcceptFriendRequestDto {
  requester_id: number;
}

export interface DeclineFriendRequestDto {
  requester_id: number;
}

export interface FriendshipResponseDto {
  requester_id?: number;
  addressee_id?: number;
  status?: "NONE" | "PENDING" | "ACCEPTED" | "DECLINED";
  created_at?: string;
  accepted_at?: string;
}

export interface FollowingUserDto {
  user_id?: number;
  full_name?: string;
  avatar_url?: string;
  frame_url?: string;
  role?: "ADMIN" | "LECTURER" | "STUDENT";
  school_faculty?: string;
  code?: string;
  followed_at?: string;
  friend?: boolean;
  following_me?: boolean;
}

export interface FollowingListResponseDto {
  items?: Array<FollowingUserDto>;
  pagination?: CursorPaginationDto;
  total_following?: number;
}

export interface FollowerUserDto {
  user_id?: number;
  full_name?: string;
  avatar_url?: string;
  frame_url?: string;
  role?: "ADMIN" | "LECTURER" | "STUDENT";
  school_faculty?: string;
  code?: string;
  followed_me_at?: string;
  following_back?: boolean;
  friend?: boolean;
}

export interface FollowerListResponseDto {
  items?: Array<FollowerUserDto>;
  pagination?: CursorPaginationDto;
  total_followers?: number;
}

export interface FollowResponseDto {
  target_user_id?: number;
  new_followers_count?: number;
  followed_at?: string;
  following?: boolean;
}

export interface UnfollowResponseDto {
  target_user_id?: number;
  new_followers_count?: number;
  following?: boolean;
}

export interface BlockResponseDto {
  blocked_user_id?: number;
  blocked?: boolean;
}

export interface UnblockResponseDto {
  unblocked_user_id?: number;
  blocked?: boolean;
}

export interface BlockedUserDto {
  user_id?: number;
  full_name?: string;
  avatar_url?: string;
  frame_url?: string;
  blocked_at?: string;
}

export interface BlockedListResponseDto {
  items?: Array<BlockedUserDto>;
  pagination?: CursorPaginationDto;
  total_blocked?: number;
}

export interface PostSearchResultDto {
  post_id?: number;
  content?: string;
  author_id?: number;
  author_name?: string;
  author_avatar_url?: string;
  author_frame_url?: string;
  post_type?:
    | "LEARNING_VIDEO"
    | "SOCIAL_POST"
    | "QUESTION_APPROVED_NOTIFICATION"
    | "LEADERBOARD_HONOR";
  media_urls?: Array<string>;
  react_count?: number;
  comment_count?: number;
  created_at?: string;
}

export interface UserSearchResultDto {
  user_id?: number;
  full_name?: string;
  student_lecturer_code?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  avatar_frame_url?: string;
  school_faculty?: string;
  major?: string;
  role?: "ADMIN" | "LECTURER" | "STUDENT";
  total_proposed_questions?: number;
  badges_count?: number;
  followers_count?: number;
}

export interface QuestionOptionDto {
  key?: string;
  text?: string;
  media_url?: string;
}

export interface QuestionSearchResultDto {
  question_id?: number;
  question_code?: string;
  subject_id?: number;
  subject_name?: string;
  topic_id?: number;
  topic_name?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  difficulty?: "UNCLASSIFIED" | "EASY" | "MEDIUM" | "HARD";
  content?: string;
  options?: Array<QuestionOptionDto>;
  explanation?: string;
  image_urls?: Array<string>;
  avg_rating?: number;
  rating_count?: number;
  react_count?: number;
  comment_count?: number;
  created_at?: string;
}

export interface SessionSearchResultDto {
  session_id?: number;
  title?: string;
  content?: string;
  subject_id?: number;
  subject_name?: string;
  status?: "PENDING" | "REVIEWING" | "RESOLVED";
  question_count?: number;
  react_count?: number;
  comment_count?: number;
  created_at?: string;
}

export interface SubjectSearchResultDto {
  subject_id?: number;
  subject_code?: string;
  subject_name?: string;
}

export interface SearchResultItemDto {
  type?: "ALL" | "POST" | "USER" | "QUESTION" | "SESSION" | "SUBJECT";
  relevance_score?: number;
  post?: PostSearchResultDto;
  user?: UserSearchResultDto;
  question?: QuestionSearchResultDto;
  session?: SessionSearchResultDto;
  subject?: SubjectSearchResultDto;
}

export interface GlobalSearchResponseDto {
  items?: Array<SearchResultItemDto>;
  pagination?: CursorPaginationDto;
  total_hits?: number;
}

export interface MediaUploadResponse {
  object_key?: string;
  url?: string;
  file_size?: number;
  content_type?: string;
  media_type?: "IMAGE" | "VIDEO" | "DOCUMENT";
  width?: number;
  height?: number;
}
