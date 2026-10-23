import { Wish, EventSettings, WishStats } from '../types';

export const api = {
  async getSettings(): Promise<{ settings: EventSettings; stats: WishStats }> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Không thể tải cài đặt');
    return res.json();
  },

  async updateSettings(partial: Partial<EventSettings>): Promise<EventSettings> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) throw new Error('Không thể cập nhật cài đặt');
    const data = await res.json();
    return data.settings;
  },

  async getApprovedWishes(): Promise<{ wishes: Wish[]; total: number }> {
    const res = await fetch('/api/wishes');
    if (!res.ok) throw new Error('Không thể tải danh sách điều ước');
    return res.json();
  },

  async getAllWishes(): Promise<{ wishes: Wish[]; total: number }> {
    const res = await fetch('/api/admin/wishes');
    if (!res.ok) throw new Error('Không thể tải danh sách quản trị');
    return res.json();
  },

  async submitWish(messageContent: string): Promise<{ success: boolean; wish: Wish; moderation_enabled: boolean }> {
    const res = await fetch('/api/wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_content: messageContent }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gửi điều ước thất bại');
    }
    return data;
  },

  async updateWishStatus(id: string, status: Wish['status']): Promise<Wish> {
    const res = await fetch(`/api/admin/wishes/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cập nhật trạng thái thất bại');
    return data.wish;
  },

  async deleteWish(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/wishes/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) return true;
    } catch {
      // Fallback to POST
    }

    const resFallback = await fetch(`/api/admin/wishes/${id}/delete`, {
      method: 'POST',
    });
    if (!resFallback.ok) throw new Error('Xóa điều ước thất bại');
    return true;
  },

  async batchUpdateStatus(ids: string[], status: Wish['status']): Promise<Wish[]> {
    const res = await fetch('/api/admin/wishes/batch-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Duyệt hàng loạt thất bại');
    return data.updated;
  },

  async batchDeleteWishes(ids: string[]): Promise<string[]> {
    const res = await fetch('/api/admin/wishes/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Xóa hàng loạt thất bại');
    return data.ids;
  },

  async seedWishes(count: number = 5): Promise<Wish[]> {
    const res = await fetch('/api/admin/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Tạo mẫu thất bại');
    return data.added;
  },

  async resetData(): Promise<boolean> {
    const res = await fetch('/api/admin/reset', {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Đặt lại thất bại');
    return true;
  },

  getExportCsvUrl(): string {
    return '/api/export-csv';
  },

  downloadCsv(wishes: Wish[]) {
    // Generate UTF-8 BOM CSV that Excel on Windows & Mac opens directly without font corruption
    let csv = '\uFEFF';
    csv += 'STT,Mã Điều Ước,Nội Dung Lời Chúc,Trạng Thái,Thời Gian Gửi,Thời Gian Duyệt\r\n';

    const statusLabels: Record<string, string> = {
      approved: 'Đã duyệt',
      pending: 'Chờ duyệt',
      rejected: 'Từ chối',
      hidden: 'Đã ẩn'
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
  }
};
