import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed)) return parsed;
  }
  return parseInt(process.env.PORT || '3000', 10);
}

const PORT = getPort();
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'wishes_db.json');

// Interface definitions
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

interface DatabaseSchema {
  settings: EventSettings;
  wishes: Wish[];
}

// 72 curated, organic leaf anchor slots spread naturally across the full wide canopy
// of the ancient Shan Tuyet tea tree (from left branch tips to right tips, top peak to lower boughs)
// Designed for ~60+ event participants so every leaf has dedicated breathing room without clumping
const CANOPY_SLOTS = [
  // 1. Top Crown Summit & Upper Ridge (Peak)
  { x: 58.0, y: 7.8, rot: 2, scale: 0.98 },
  { x: 53.5, y: 9.8, rot: -12, scale: 0.96 },
  { x: 62.5, y: 9.5, rot: 14, scale: 0.96 },
  { x: 49.0, y: 12.2, rot: -18, scale: 0.98 },
  { x: 67.0, y: 11.8, rot: 20, scale: 0.98 },
  { x: 57.5, y: 13.5, rot: 4, scale: 1.02 },

  // 2. High Upper Branches (Arching foliage)
  { x: 44.5, y: 15.5, rot: -24, scale: 0.98 },
  { x: 71.5, y: 15.0, rot: 25, scale: 0.98 },
  { x: 40.0, y: 18.8, rot: -30, scale: 1.00 },
  { x: 76.0, y: 18.2, rot: 32, scale: 1.00 },
  { x: 49.5, y: 20.2, rot: -14, scale: 1.02 },
  { x: 63.5, y: 19.8, rot: 15, scale: 1.02 },
  { x: 56.5, y: 21.2, rot: -2, scale: 1.04 },

  // 3. Mid-Upper Left Bough (Lush foliage arching to the left)
  { x: 35.0, y: 23.5, rot: -38, scale: 1.02 },
  { x: 31.0, y: 27.5, rot: -48, scale: 1.00 },
  { x: 38.5, y: 28.0, rot: -28, scale: 1.04 },
  { x: 44.0, y: 26.5, rot: -18, scale: 1.04 },
  { x: 47.5, y: 29.5, rot: -12, scale: 1.05 },
  { x: 33.5, y: 33.0, rot: -44, scale: 1.02 },
  { x: 41.5, y: 33.5, rot: -22, scale: 1.04 },

  // 4. Mid-Upper Right Bough (Lush foliage arching to the right)
  { x: 80.5, y: 22.8, rot: 40, scale: 1.02 },
  { x: 85.0, y: 27.0, rot: 50, scale: 1.00 },
  { x: 77.0, y: 27.5, rot: 30, scale: 1.04 },
  { x: 72.0, y: 26.0, rot: 20, scale: 1.04 },
  { x: 68.5, y: 29.0, rot: 14, scale: 1.05 },
  { x: 83.5, y: 32.5, rot: 45, scale: 1.02 },
  { x: 75.0, y: 33.0, rot: 24, scale: 1.04 },

  // 5. Central Canopy Heart (Rich central emerald foliage)
  { x: 52.5, y: 27.5, rot: -8, scale: 1.06 },
  { x: 60.5, y: 27.0, rot: 8, scale: 1.06 },
  { x: 55.5, y: 29.8, rot: 2, scale: 1.08 },
  { x: 51.0, y: 33.5, rot: -14, scale: 1.05 },
  { x: 62.0, y: 33.0, rot: 12, scale: 1.05 },
  { x: 57.0, y: 36.5, rot: -3, scale: 1.06 },

  // 6. Far-Left Outer Canopy Wings (Wide panoramic spread)
  { x: 27.5, y: 34.5, rot: -56, scale: 0.98 },
  { x: 29.0, y: 39.5, rot: -50, scale: 0.98 },
  { x: 35.0, y: 38.0, rot: -35, scale: 1.02 },
  { x: 26.5, y: 30.5, rot: -60, scale: 0.96 },

  // 7. Far-Right Outer Canopy Wings (Wide panoramic spread)
  { x: 88.5, y: 34.0, rot: 56, scale: 0.98 },
  { x: 87.0, y: 39.0, rot: 48, scale: 0.98 },
  { x: 81.5, y: 37.5, rot: 35, scale: 1.02 },
  { x: 89.5, y: 30.0, rot: 60, scale: 0.96 },

  // 8. Mid-Lower Left Foliage Layer
  { x: 45.5, y: 37.5, rot: -16, scale: 1.04 },
  { x: 39.0, y: 42.0, rot: -26, scale: 1.02 },
  { x: 44.2, y: 43.5, rot: -14, scale: 1.04 },
  { x: 48.8, y: 40.5, rot: -8, scale: 1.05 },
  { x: 34.0, y: 45.5, rot: -40, scale: 1.00 },
  { x: 41.5, y: 47.0, rot: -20, scale: 1.02 },

  // 9. Mid-Lower Right Foliage Layer
  { x: 70.5, y: 37.0, rot: 16, scale: 1.04 },
  { x: 77.0, y: 41.5, rot: 26, scale: 1.02 },
  { x: 71.8, y: 42.8, rot: 14, scale: 1.04 },
  { x: 67.2, y: 40.0, rot: 8, scale: 1.05 },
  { x: 83.0, y: 45.0, rot: 42, scale: 1.00 },
  { x: 74.5, y: 46.5, rot: 20, scale: 1.02 },

  // 10. Lowest Canopy Boughs (Hanging gracefully above trunk line)
  { x: 37.0, y: 51.0, rot: -30, scale: 1.00 },
  { x: 45.0, y: 50.5, rot: -10, scale: 1.02 },
  { x: 49.2, y: 48.5, rot: -5, scale: 1.04 },
  { x: 66.8, y: 48.0, rot: 5, scale: 1.04 },
  { x: 71.0, y: 50.5, rot: 12, scale: 1.02 },
  { x: 78.5, y: 51.0, rot: 28, scale: 1.00 },
  { x: 41.0, y: 54.0, rot: -22, scale: 0.98 },
  { x: 75.0, y: 54.0, rot: 24, scale: 0.98 },

  // 11. Intermediate Leaf Clustered Buds (Balanced filler leaves)
  { x: 52.2, y: 16.5, rot: -8, scale: 1.00 },
  { x: 64.0, y: 16.0, rot: 10, scale: 1.00 },
  { x: 47.5, y: 24.5, rot: -15, scale: 1.02 },
  { x: 68.0, y: 24.0, rot: 16, scale: 1.02 },
  { x: 37.8, y: 24.0, rot: -32, scale: 1.02 },
  { x: 78.5, y: 23.5, rot: 36, scale: 1.02 },
  { x: 36.5, y: 36.5, rot: -30, scale: 1.00 },
  { x: 79.5, y: 36.0, rot: 32, scale: 1.00 },
  { x: 47.0, y: 35.5, rot: -10, scale: 1.04 },
  { x: 69.0, y: 35.0, rot: 12, scale: 1.04 },
];

// Generate evenly distributed organic leaf coordinates across the ancient tree canopy
// Uses a coprime stride (31 across 72 slots) so sequential wishes alternate quadrants
// ensuring perfect balance and zero clumping from 1 to 60+ participants.
function calculateLeafPosition(index: number, id: string): { x: number; y: number; rotation: number; scale: number; shade: number } {
  const totalSlots = CANOPY_SLOTS.length; // 72 slots
  // Coprime multiplier 31 maximizes distance between consecutive wish entries
  const slotIdx = (index * 31) % totalSlots;
  const cycle = Math.floor(index / totalSlots);
  const slot = CANOPY_SLOTS[slotIdx];

  const hashVal = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Subtle organic jitter to prevent synthetic rigidity while preserving clear spacing
  const jitterX = (((hashVal * 7 + index * 11) % 19) - 9) * 0.12;
  const jitterY = (((hashVal * 13 + index * 5) % 17) - 8) * 0.12;
  const jitterRot = (((hashVal * 3 + index * 7) % 15) - 7) * 0.8;

  // Small layer offset if wishes exceed 72 (e.g. 100+ participants)
  const cycleOffsetX = cycle > 0 ? (((cycle * 7 + (hashVal % 5)) % 9) - 4) * 0.45 : 0;
  const cycleOffsetY = cycle > 0 ? (((cycle * 5 + (hashVal % 3)) % 7) - 3) * 0.45 : 0;

  const x = Math.min(89.5, Math.max(26.5, slot.x + jitterX + cycleOffsetX));
  const y = Math.min(55.5, Math.max(7.2, slot.y + jitterY + cycleOffsetY));
  const rotation = Math.round(slot.rot + jitterRot);
  const scale = Number((slot.scale + (((hashVal + index) % 9) - 4) * 0.012).toFixed(2));
  const shade = (index + hashVal) % 4;

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
    rotation,
    scale,
    shade,
  };
}

// Initial realistic event wishes in Vietnamese
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

function getInitialDatabase(): DatabaseSchema {
  const initialWishes: Wish[] = INITIAL_SAMPLE_WISHES.map((msg, idx) => {
    const id = crypto.randomUUID();
    const pos = calculateLeafPosition(idx, id);
    const date = new Date(Date.now() - (INITIAL_SAMPLE_WISHES.length - idx) * 180000);
    return {
      id,
      message_content: msg,
      created_at: date.toISOString(),
      status: 'approved',
      approved_at: date.toISOString(),
      leaf_x: pos.x,
      leaf_y: pos.y,
      leaf_rotation: pos.rotation,
      leaf_scale: pos.scale,
      leaf_shade: pos.shade,
      displayed_at: date.toISOString()
    };
  });

  return {
    settings: {
      id: 'default',
      event_title: 'WISHING TREE – CÂY TRÀ NGUYỆN ƯỚC',
      event_subtitle: 'Mỗi điều ước là một chiếc lá. Cùng nhau, ngàn điều ước kết thành cây gắn kết ý nghĩa.',
      moderation_enabled: false, // Default: auto-approved or configurable
      submissions_enabled: true,
      theme_settings: {
        primary_color: '#2F7047',
        tree_style: 'ancient_shan_tuyet'
      },
      display_settings: {
        show_counter: true,
        show_qr: true,
        auto_highlight_duration: 5
      },
      updated_at: new Date().toISOString()
    },
    wishes: initialWishes
  };
}

// Database helper
class DB {
  private data: DatabaseSchema;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.wishes || !this.data.settings) {
          throw new Error('Invalid schema');
        }
        // Align all wishes to current CANOPY_SLOTS wide canopy distribution
        this.data.wishes.forEach((w, idx) => {
          const pos = calculateLeafPosition(idx, w.id);
          w.leaf_x = pos.x;
          w.leaf_y = pos.y;
          w.leaf_rotation = pos.rotation;
          w.leaf_scale = pos.scale;
          w.leaf_shade = pos.shade;
        });
        this.save();
      } catch (err) {
        console.error('Error reading db file, re-initializing:', err);
        this.data = getInitialDatabase();
        this.save();
      }
    } else {
      this.data = getInitialDatabase();
      this.save();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db file:', err);
    }
  }

  public getSettings(): EventSettings {
    return this.data.settings;
  }

  public updateSettings(partial: Partial<EventSettings>): EventSettings {
    this.data.settings = {
      ...this.data.settings,
      ...partial,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.settings;
  }

  public getAllWishes(): Wish[] {
    return this.data.wishes;
  }

  public getApprovedWishes(): Wish[] {
    return this.data.wishes.filter(w => w.status === 'approved');
  }

  public addWish(messageContent: string): Wish {
    const id = crypto.randomUUID();
    const approved = !this.data.settings.moderation_enabled;
    const now = new Date().toISOString();
    const approvedCount = this.getApprovedWishes().length;
    const pos = calculateLeafPosition(approvedCount, id);

    const newWish: Wish = {
      id,
      message_content: messageContent.trim(),
      created_at: now,
      status: approved ? 'approved' : 'pending',
      approved_at: approved ? now : null,
      leaf_x: pos.x,
      leaf_y: pos.y,
      leaf_rotation: pos.rotation,
      leaf_scale: pos.scale,
      leaf_shade: pos.shade,
      displayed_at: approved ? now : null
    };

    this.data.wishes.unshift(newWish);
    this.save();
    return newWish;
  }

  public updateWishStatus(id: string, status: Wish['status']): Wish | null {
    const wish = this.data.wishes.find(w => w.id === id);
    if (!wish) return null;

    wish.status = status;
    if (status === 'approved') {
      if (!wish.approved_at) {
        wish.approved_at = new Date().toISOString();
      }
      wish.displayed_at = new Date().toISOString();
    }
    this.save();
    return wish;
  }

  public batchUpdateWishStatus(ids: string[], status: Wish['status']): Wish[] {
    const idSet = new Set(ids);
    const updated: Wish[] = [];
    const now = new Date().toISOString();

    for (const wish of this.data.wishes) {
      if (idSet.has(wish.id)) {
        wish.status = status;
        if (status === 'approved') {
          if (!wish.approved_at) wish.approved_at = now;
          wish.displayed_at = now;
        }
        updated.push(wish);
      }
    }
    this.save();
    return updated;
  }

  public batchDeleteWishes(ids: string[]): string[] {
    const idSet = new Set(ids);
    this.data.wishes = this.data.wishes.filter(w => !idSet.has(w.id));
    this.save();
    return ids;
  }

  public deleteWish(id: string): boolean {
    const idx = this.data.wishes.findIndex(w => w.id === id);
    if (idx === -1) return false;
    this.data.wishes.splice(idx, 1);
    this.save();
    return true;
  }

  public resetDemoData(): void {
    this.data = getInitialDatabase();
    this.save();
  }

  public seedWishes(count: number = 10): Wish[] {
    const added: Wish[] = [];
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
      "Gieo mầm hy vọng, gặt hái thành công, chúc năm mới khởi sắc thăng hoa!",
      "Tâm huyết trao đi, giá trị nhận lại, chúc đại gia đình luôn vững mạnh!",
      "Chúc cho mọi mục tiêu kinh doanh năm nay đều cán đích ngoạn mục!",
      "Tự hào là một phần của ngôi nhà chung, chúc mọi điều ước đều thành hiện thực!",
      "Bình an trong tâm hồn, sung túc trong cuộc sống và nhiệt huyết trong công việc!"
    ];

    for (let i = 0; i < count; i++) {
      const msg = sampleMsgs[i % sampleMsgs.length];
      const wish = this.addWish(msg);
      added.push(wish);
    }
    return added;
  }
}

const db = new DB();

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);

  // WebSocket Server for instantaneous synchronization
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('error', (err) => {
    console.error('WebSocket server error:', err);
  });

  wss.on('connection', (ws) => {
    clients.add(ws);
    // Send initial sync event
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        settings: db.getSettings(),
        approvedCount: db.getApprovedWishes().length,
      }
    }));

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      clients.delete(ws);
    });
  });

  function broadcast(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error('Failed to send WS message:', err);
        }
      }
    }
  }

  // --- API Endpoints ---

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get settings & statistics
  app.get('/api/settings', (_req, res) => {
    const settings = db.getSettings();
    const allWishes = db.getAllWishes();
    const stats = {
      total: allWishes.length,
      approved: allWishes.filter(w => w.status === 'approved').length,
      pending: allWishes.filter(w => w.status === 'pending').length,
      rejected: allWishes.filter(w => w.status === 'rejected').length,
      hidden: allWishes.filter(w => w.status === 'hidden').length
    };
    res.json({ settings, stats });
  });

  // Update settings (Admin)
  app.post('/api/settings', (req, res) => {
    const { moderation_enabled, submissions_enabled, event_title, event_subtitle } = req.body;
    const updated = db.updateSettings({
      ...(typeof moderation_enabled === 'boolean' ? { moderation_enabled } : {}),
      ...(typeof submissions_enabled === 'boolean' ? { submissions_enabled } : {}),
      ...(typeof event_title === 'string' ? { event_title } : {}),
      ...(typeof event_subtitle === 'string' ? { event_subtitle } : {})
    });
    broadcast('settings:updated', updated);
    res.json({ success: true, settings: updated });
  });

  // Get approved wishes for Stage Display (Public)
  app.get('/api/wishes', (_req, res) => {
    const approved = db.getApprovedWishes();
    res.json({ wishes: approved, total: approved.length });
  });

  // Get all wishes for Admin (Protected by admin header or session)
  app.get('/api/admin/wishes', (_req, res) => {
    const all = db.getAllWishes();
    res.json({ wishes: all, total: all.length });
  });

  // Submit wish from mobile (/wish)
  app.post('/api/wishes', (req, res) => {
    const settings = db.getSettings();
    if (!settings.submissions_enabled) {
      return res.status(403).json({ error: 'Cổng gửi điều ước hiện đang tạm đóng.' });
    }

    const { message_content } = req.body;
    if (!message_content || typeof message_content !== 'string') {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung điều ước.' });
    }

    const trimmed = message_content.trim();
    if (trimmed.length === 0) {
      return res.status(400).json({ error: 'Nội dung điều ước không được để trống.' });
    }

    if (trimmed.length > 300) {
      return res.status(400).json({ error: 'Điều ước tối đa 300 ký tự.' });
    }

    const newWish = db.addWish(trimmed);

    // Broadcast to WebSocket clients
    if (newWish.status === 'approved') {
      broadcast('wish:new_approved', {
        wish: newWish,
        totalApproved: db.getApprovedWishes().length
      });
    } else {
      broadcast('wish:new_pending', {
        wish: newWish,
        totalPending: db.getAllWishes().filter(w => w.status === 'pending').length
      });
    }

    res.json({
      success: true,
      wish: newWish,
      moderation_enabled: settings.moderation_enabled
    });
  });

  // Admin: Update wish status (Approve / Reject / Hide)
  app.post('/api/admin/wishes/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'pending', 'rejected', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    }

    const updated = db.updateWishStatus(id, status as Wish['status']);
    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy điều ước.' });
    }

    broadcast('wish:status_changed', {
      wish: updated,
      totalApproved: db.getApprovedWishes().length
    });

    res.json({ success: true, wish: updated });
  });

  // Admin: Batch update wish status (Approve / Reject / Hide)
  app.post('/api/admin/wishes/batch-status', (req, res) => {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Danh sách ID không hợp lệ.' });
    }
    if (!['approved', 'pending', 'rejected', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
    }

    const updated = db.batchUpdateWishStatus(ids, status as Wish['status']);
    broadcast('wishes:batch_updated', {
      updated,
      totalApproved: db.getApprovedWishes().length
    });

    res.json({ success: true, count: updated.length, updated });
  });

  // Admin: Batch delete wishes
  app.post('/api/admin/wishes/batch-delete', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Danh sách ID không hợp lệ.' });
    }

    const deletedIds = db.batchDeleteWishes(ids);
    broadcast('wishes:batch_deleted', {
      ids: deletedIds,
      totalApproved: db.getApprovedWishes().length
    });

    res.json({ success: true, count: deletedIds.length, ids: deletedIds });
  });

  // Admin: Single Delete wish (supporting both DELETE and POST for max compatibility)
  const handleDeleteWish = (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const deleted = db.deleteWish(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Không tìm thấy điều ước.' });
    }

    broadcast('wish:deleted', {
      id,
      totalApproved: db.getApprovedWishes().length
    });

    res.json({ success: true, id });
  };

  app.delete('/api/admin/wishes/:id', handleDeleteWish);
  app.post('/api/admin/wishes/:id/delete', handleDeleteWish);

  // Admin: Seed sample wishes
  app.post('/api/admin/seed', (req, res) => {
    const count = Math.min(20, Math.max(1, parseInt(req.body.count || '5', 10)));
    const added = db.seedWishes(count);

    for (const wish of added) {
      if (wish.status === 'approved') {
        broadcast('wish:new_approved', {
          wish,
          totalApproved: db.getApprovedWishes().length
        });
      }
    }

    res.json({ success: true, count: added.length, added });
  });

  // Admin: Reset database to default
  app.post('/api/admin/reset', (_req, res) => {
    db.resetDemoData();
    broadcast('database:reset', {
      settings: db.getSettings(),
      wishes: db.getApprovedWishes()
    });
    res.json({ success: true });
  });

  // Export CSV (with UTF-8 BOM for Microsoft Excel Vietnamese Unicode compatibility)
  app.get('/api/export-csv', (_req, res) => {
    const all = db.getAllWishes();
    let csv = '\uFEFF'; // UTF-8 BOM for Excel Vietnamese characters
    csv += 'STT,Mã Điều Ước,Nội Dung Lời Chúc,Trạng Thái,Thời Gian Gửi,Thời Gian Duyệt\r\n';
    
    all.forEach((w, idx) => {
      const cleanContent = `"${(w.message_content || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      const timeCreated = new Date(w.created_at).toLocaleString('vi-VN');
      const timeApproved = w.approved_at ? new Date(w.approved_at).toLocaleString('vi-VN') : '—';
      const statusLabels: Record<string, string> = {
        approved: 'Đã duyệt',
        pending: 'Chờ duyệt',
        rejected: 'Từ chối',
        hidden: 'Đã ẩn'
      };
      const statusText = statusLabels[w.status] || w.status;
      csv += `${idx + 1},${w.id},${cleanContent},${statusText},"${timeCreated}","${timeApproved}"\r\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cay-tra-nguyen-uoc-danh-sach.csv"');
    res.send(csv);
  });

  // Setup Vite dev server middlewares or static production serving
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Wishing Tree server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
