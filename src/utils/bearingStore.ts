/**
 * 方位读数广播store
 *
 * 3D 引擎每帧（~60fps）上报旋转角。若走 React state，会导致整棵HUD 树
 * 每帧重渲染60 次（EnergyGauge 已在承受这个开销）。
 *
 * 这里改用「外部 store + 命令式 DOM 更新」：
 *   - 数字 / 指针角度：每帧直接写 textContent 与 transform，零 React 渲染
 *   - 山名单字与配色：仅在跨越 15° 山位边界时才 setState（每转一圈约 24 次）
 */

export interface BearingSnapshot {
  /** 物理旋转角0..360（未做任何镜像反算） */
  angle: number;
  /** 罗盘 3D 贴图是否处于左右镜像态 */
  mirrored: boolean;
}

let snapshot: BearingSnapshot = { angle: 0, mirrored: false };
const listeners = new Set<(s: BearingSnapshot) => void>();

export const bearingStore = {
  get(): BearingSnapshot {
    return snapshot;
  },
  publish(angle: number, mirrored: boolean): void {
    if (angle === snapshot.angle && mirrored === snapshot.mirrored) return;
    snapshot = { angle, mirrored };
    listeners.forEach((fn) => fn(snapshot));
  },
  subscribe(fn: (s: BearingSnapshot) => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};