export interface Wish {
  id: string;
  message_content: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'hidden';
  approved_at: string | null;
  leaf_x: number;
  leaf_y: number;
  leaf_rotation: number;
  leaf_scale: number;
  leaf_shade: number;
  displayed_at: string | null;
}

export interface EventSettings {
  id: string;
  event_title: string;
  event_subtitle: string;
  moderation_enabled: boolean;
  submissions_enabled: boolean;
  theme_settings: {
    primary_color: string;
    tree_style: string;
  };
  display_settings: {
    show_counter: boolean;
    show_qr: boolean;
    auto_highlight_duration: number;
  };
  updated_at: string;
}

export interface WishStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  hidden: number;
}
