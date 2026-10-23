import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Wish, EventSettings, WishStats } from '../types';
import { calculateLeafPosition } from '../utils/leafPosition';

const DEFAULT_SETTINGS: EventSettings = {
  id: 'default',
  event_title: 'WISHING TREE – CÂY TRÀ NGUYỆN ƯỚC',
  event_subtitle: 'Mỗi điều ước là một chiếc lá. Cùng nhau, ngàn điều ước kết thành cây gắn kết ý nghĩa.',
  moderation_enabled: false,
  submissions_enabled: true,
  theme_settings: {
    primary_color: '#2F7047',
    tree_style: 'ancient_shan_tuyet',
  },
  display_settings: {
    show_counter: true,
    show_qr: true,
    auto_highlight_duration: 5,
  },
  updated_at: new Date().toISOString(),
};

const INITIAL_SAMPLE_WISHES: string[] = [
  "Chúc mừng đại lễ kỷ niệm thành công rực rỡ, thương hiệu ngày càng vươn xa toàn cầu!",
  "Kính chúc ban lãnh đạo và toàn thể anh chị em luôn dồi dào sức khỏe, nhiệt huyết và đoàn kết.",
  "Biết ơn những người đồng đội tuyệt vời đã luôn sát cánh, cùng nhau vượt qua mọi thử thách.",
  "Mỗi chiếc lá là một niềm tin son sắt, chúc công ty luôn tràn đầy sức sống và bứt phá ngoạn mục!",
  "Cảm ơn vì một năm đầy nỗ lực. Chúc gia đình chúng ta luôn bình an, thịnh vượng và hạnh phúc.",
  "Chúc cho những khát vọng của chúng ta hôm nay sẽ nở hoa kết trái rực rỡ trong tương lai.",
  "Một hành trình diệu kỳ, tự hào là một phần của đại gia đình thân yêu này!",
  "Nguyện ước bình an, may mắn và mọi điều tốt đẹp nhất đến với tất cả các thành viên.",
  "Vững bước tiên phong, kiến tạo giá trị bền vững và mang lại hạnh phúc cho cộng đồng.",
  "Gửi gắm vào cây trà cổ thụ lời tri ân sâu sắc nhất tới tất cả những ai đã cống hiến âm thầm.",
  "Chúc năm mới khởi sắc thăng hoa, doanh thu vượt đỉnh, vạn sự hanh thông!",
  "Đoàn kết là sức mạnh, cùng nhau ta có thể chạm tới những đỉnh cao mới.",
  "Tâm huyết trao đi, yêu thương nhận lại. Chúc cho tinh thần trà Việt luôn lan tỏa muôn phương.",
  "Nguyện cho mỗi dự án mới đều thuận buồm xuôi gió, ghi dấu ấn rạng rỡ trên thị trường.",
  "Chúc tập thể chúng ta mãi giữ vững ngọn lửa đam mê, sáng tạo và bứt phá không ngừng!"
];

export const api = {
  async getSettings(): Promise<{ settings: EventSettings; stats: WishStats }> {
    if (!isFirebaseConfigured) {
      return {
        settings: DEFAULT_SETTINGS,
        stats: { total: 0, approved: 0, pending: 0, rejected: 0, hidden: 0 },
      };
    }

    try {
      const settingsRef = doc(db, 'settings', 'default');
      const snap = await getDoc(settingsRef);

      let settings: EventSettings = DEFAULT_SETTINGS;
      if (snap.exists()) {
        settings = snap.data() as EventSettings;
      } else {
        // Initialize default settings doc in Firestore
        await setDoc(settingsRef, DEFAULT_SETTINGS);
      }

      // Compute stats
      const wishesSnap = await getDocs(collection(db, 'wishes'));
      const allWishes = wishesSnap.docs.map((d) => d.data() as Wish);

      // If database is completely empty on first launch, auto-seed initial wishes
      if (allWishes.length === 0) {
        await this.seedInitialWishes();
        const refreshedSnap = await getDocs(collection(db, 'wishes'));
        const refreshedWishes = refreshedSnap.docs.map((d) => d.data() as Wish);
        return {
          settings,
          stats: this.calculateStats(refreshedWishes),
        };
      }

      return {
        settings,
        stats: this.calculateStats(allWishes),
      };
    } catch (err) {
      console.warn('Failed to load settings from Firestore, fallback to defaults:', err);
      return {
        settings: DEFAULT_SETTINGS,
        stats: { total: 0, approved: 0, pending: 0, rejected: 0, hidden: 0 },
      };
    }
  },

  calculateStats(wishes: Wish[]): WishStats {
    return {
      total: wishes.length,
      approved: wishes.filter((w) => w.status === 'approved').length,
      pending: wishes.filter((w) => w.status === 'pending').length,
      rejected: wishes.filter((w) => w.status === 'rejected').length,
      hidden: wishes.filter((w) => w.status === 'hidden').length,
    };
  },

  async updateSettings(partial: Partial<EventSettings>): Promise<EventSettings> {
    const settingsRef = doc(db, 'settings', 'default');
    const snap = await getDoc(settingsRef);
    const current = snap.exists() ? (snap.data() as EventSettings) : DEFAULT_SETTINGS;

    const updated: EventSettings = {
      ...current,
      ...partial,
      updated_at: new Date().toISOString(),
    };

    await setDoc(settingsRef, updated);
    return updated;
  },

  async getApprovedWishes(): Promise<{ wishes: Wish[]; total: number }> {
    if (!isFirebaseConfigured) return { wishes: [], total: 0 };

    try {
      const q = query(
        collection(db, 'wishes'),
        where('status', '==', 'approved')
      );
      const snap = await getDocs(q);
      const wishes = snap.docs.map((d) => d.data() as Wish);

      // If empty, auto-seed and reload
      if (wishes.length === 0) {
        await this.seedInitialWishes();
        const reloadSnap = await getDocs(q);
        const reloadWishes = reloadSnap.docs.map((d) => d.data() as Wish);
        reloadWishes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return { wishes: reloadWishes, total: reloadWishes.length };
      }

      // Sort descending by created_at in client
      wishes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { wishes, total: wishes.length };
    } catch (err) {
      console.warn('Error fetching approved wishes:', err);
      return { wishes: [], total: 0 };
    }
  },

  async getAllWishes(): Promise<{ wishes: Wish[]; total: number }> {
    if (!isFirebaseConfigured) return { wishes: [], total: 0 };

    try {
      const snap = await getDocs(collection(db, 'wishes'));
      const wishes = snap.docs.map((d) => d.data() as Wish);
      wishes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { wishes, total: wishes.length };
    } catch (err) {
      console.warn('Error fetching all wishes:', err);
      return { wishes: [], total: 0 };
    }
  },

  async submitWish(messageContent: string): Promise<{ success: boolean; wish: Wish; moderation_enabled: boolean }> {
    const trimmed = messageContent.trim();
    if (!trimmed) {
      throw new Error('Nội dung điều ước không được để trống.');
    }
    if (trimmed.length > 300) {
      throw new Error('Điều ước tối đa 300 ký tự.');
    }

    // Get current moderation setting
    const { settings } = await this.getSettings();
    if (!settings.submissions_enabled) {
      throw new Error('Cổng gửi điều ước hiện đang tạm đóng.');
    }

    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `wish_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    // Get current approved count to compute organic leaf placement
    const { total: approvedCount } = await this.getApprovedWishes();
    const pos = calculateLeafPosition(approvedCount, id);

    const isApproved = !settings.moderation_enabled;

    const newWish: Wish = {
      id,
      message_content: trimmed,
      created_at: now,
      status: isApproved ? 'approved' : 'pending',
      approved_at: isApproved ? now : null,
      leaf_x: pos.x,
      leaf_y: pos.y,
      leaf_rotation: pos.rotation,
      leaf_scale: pos.scale,
      leaf_shade: pos.shade,
      displayed_at: isApproved ? now : null,
    };

    const wishDoc = doc(db, 'wishes', id);
    await setDoc(wishDoc, newWish);

    return {
      success: true,
      wish: newWish,
      moderation_enabled: settings.moderation_enabled,
    };
  },

  async updateWishStatus(id: string, status: Wish['status']): Promise<Wish> {
    const wishRef = doc(db, 'wishes', id);
    const snap = await getDoc(wishRef);
    if (!snap.exists()) {
      throw new Error('Không tìm thấy điều ước.');
    }

    const current = snap.data() as Wish;
    const now = new Date().toISOString();
    const updates: Partial<Wish> = {
      status,
      ...(status === 'approved'
        ? {
            approved_at: current.approved_at || now,
            displayed_at: now,
          }
        : {}),
    };

    await updateDoc(wishRef, updates);
    return { ...current, ...updates };
  },

  async deleteWish(id: string): Promise<boolean> {
    const wishRef = doc(db, 'wishes', id);
    await deleteDoc(wishRef);
    return true;
  },

  async batchUpdateStatus(ids: string[], status: Wish['status']): Promise<Wish[]> {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const updatedList: Wish[] = [];

    for (const id of ids) {
      const ref = doc(db, 'wishes', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const cur = snap.data() as Wish;
        const upd: Partial<Wish> = {
          status,
          ...(status === 'approved' ? { approved_at: cur.approved_at || now, displayed_at: now } : {}),
        };
        batch.update(ref, upd);
        updatedList.push({ ...cur, ...upd });
      }
    }

    await batch.commit();
    return updatedList;
  },

  async batchDeleteWishes(ids: string[]): Promise<string[]> {
    const batch = writeBatch(db);
    for (const id of ids) {
      batch.delete(doc(db, 'wishes', id));
    }
    await batch.commit();
    return ids;
  },

  async seedWishes(count: number = 5): Promise<Wish[]> {
    const sampleMsgs = [
      "Chúc công ty ngày càng phát triển bền vững, vươn tầm cao mới!",
      "Nguyện chúc toàn thể đại gia đình Nam A Bank luôn an khang, thịnh vượng!",
      "Biết ơn vì được làm việc cùng những người đồng nghiệp tài năng và tận tâm.",
      "Chúc cho mọi dự án trong năm mới đều gặt hái thành công vượt bậc!",
      "Một năm mới tràn đầy năng lượng tích cực, đổi mới, sáng tạo và bứt phá!",
      "Cảm ơn vì những hành trình đáng nhớ, chúc chúng ta luôn vững bước đồng hành!",
      "Vạn sự như ý, sức khỏe dồi dào, niềm vui và hạnh phúc ngập tràn!",
      "Chúc thương hiệu ngày càng vươn xa, khẳng định vị thế vững chắc!",
      "Cùng nhau gieo ước nguyện xanh, gặt hái tương lai thịnh vượng rực rỡ!",
      "Mỗi ngày làm việc là một ngày vui, chúc mọi người luôn bình an và may mắn!",
      "Kính chúc ban lãnh đạo luôn sáng suốt dẫn dắt con thuyền vươn ra biển lớn!",
      "Một chặng đường đáng tự hào, chúc tập thể mãi giữ vững tinh thần nhiệt huyết!",
      "Mỗi chiếc lá là một niềm tin son sắt vào tương lai tươi sáng của chúng ta.",
      "Chúc cho đại lễ kỷ niệm thành công rực rỡ và ghi dấu ấn khó phai!",
      "Đoàn kết là sức mạnh, gắn kết yêu thương kiến tạo nên những kỳ tích mới!",
    ];

    const { total: currentApproved } = await this.getApprovedWishes();
    const batch = writeBatch(db);
    const added: Wish[] = [];

    for (let i = 0; i < count; i++) {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `seed_${Date.now()}_${i}`;
      const msg = sampleMsgs[i % sampleMsgs.length];
      const pos = calculateLeafPosition(currentApproved + i, id);
      const now = new Date(Date.now() - (count - i) * 120000).toISOString();

      const wish: Wish = {
        id,
        message_content: msg,
        created_at: now,
        status: 'approved',
        approved_at: now,
        leaf_x: pos.x,
        leaf_y: pos.y,
        leaf_rotation: pos.rotation,
        leaf_scale: pos.scale,
        leaf_shade: pos.shade,
        displayed_at: now,
      };

      batch.set(doc(db, 'wishes', id), wish);
      added.push(wish);
    }

    await batch.commit();
    return added;
  },

  async seedInitialWishes(): Promise<void> {
    const batch = writeBatch(db);
    INITIAL_SAMPLE_WISHES.forEach((msg, idx) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `init_${Date.now()}_${idx}`;
      const pos = calculateLeafPosition(idx, id);
      const now = new Date(Date.now() - (INITIAL_SAMPLE_WISHES.length - idx) * 180000).toISOString();

      const wish: Wish = {
        id,
        message_content: msg,
        created_at: now,
        status: 'approved',
        approved_at: now,
        leaf_x: pos.x,
        leaf_y: pos.y,
        leaf_rotation: pos.rotation,
        leaf_scale: pos.scale,
        leaf_shade: pos.shade,
        displayed_at: now,
      };

      batch.set(doc(db, 'wishes', id), wish);
    });

    await batch.commit();
  },

  async resetData(): Promise<boolean> {
    // Delete all existing wishes
    const snap = await getDocs(collection(db, 'wishes'));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    // Reset settings
    await setDoc(doc(db, 'settings', 'default'), DEFAULT_SETTINGS);

    // Re-seed initial wishes
    await this.seedInitialWishes();
    return true;
  },

  getExportCsvUrl(): string {
    return '#';
  },

  downloadCsv(wishes: Wish[]) {
    // Generate UTF-8 BOM CSV that Excel on Windows & Mac opens directly without font corruption
    let csv = '\uFEFF';
    csv += 'STT,Mã Điều Ước,Nội Dung Lời Chúc,Trạng Thái,Thời Gian Gửi,Thời Gian Duyệt\r\n';

    const statusLabels: Record<string, string> = {
      approved: 'Đã duyệt',
      pending: 'Chờ duyệt',
      rejected: 'Từ chối',
      hidden: 'Đã ẩn',
    };

    wishes.forEach((w, index) => {
      const cleanContent = `"${(w.message_content || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      const timeCreated = new Date(w.created_at).toLocaleString('vi-VN');
      const timeApproved = w.approved_at ? new Date(w.approved_at).toLocaleString('vi-VN') : '—';
      const statusText = statusLabels[w.status] || w.status;
      csv += `${index + 1},${w.id},${cleanContent},${statusText},"${timeCreated}","${timeApproved}"\r\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh-sach-dieu-uoc-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
