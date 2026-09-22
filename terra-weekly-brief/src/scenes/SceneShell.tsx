import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

export const amber = '#ffb23f';
export const ink = '#090a0b';

export const SceneShell: React.FC<{children: React.ReactNode; index: string; label: string}> = ({children, index, label}) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{backgroundColor: ink, color: '#f7f1e6', overflow: 'hidden'}}><AbsoluteFill style={{opacity: interpolate(frame, [0, 22, 245, 270], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)})}}>
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 78% 16%, #6d431430 0, transparent 27%), radial-gradient(circle at 12% 84%, #17333b45 0, transparent 30%)'}} />
    <div style={{position: 'absolute', top: 80, left: 76, right: 76, height: 2, backgroundColor: '#ffb23f55'}} />
    <div style={{position: 'absolute', top: 104, left: 80, fontSize: 24, fontWeight: 700, letterSpacing: 4, color: amber}}>{index} / 06</div>
    <div style={{position: 'absolute', top: 104, right: 80, fontSize: 24, letterSpacing: 2, color: '#b6b0a8'}}>{label.toUpperCase()}</div>
    <div style={{position: 'absolute', bottom: 78, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', color: '#9b978f', fontSize: 20, letterSpacing: 1.5}}><span>TERRA SPACE · WEEKLY SIGNAL BRIEF</span><span>10–16 AUG 2026</span></div>
    {children}
  </AbsoluteFill></AbsoluteFill>;
};

export const FadeTitle: React.FC<{children: React.ReactNode; top?: number; size?: number}> = ({children, top = 250, size = 88}) => {
  const frame = useCurrentFrame();
  return <div style={{position: 'absolute', top, left: 80, right: 80, fontSize: size, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1.03, opacity: interpolate(frame, [5, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)}), translate: `0 ${interpolate(frame, [5, 28], [36, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px`}}>{children}</div>;
};

export const Detail: React.FC<{children: React.ReactNode; top: number}> = ({children, top}) => {
  const frame = useCurrentFrame();
  return <div style={{position: 'absolute', top, left: 80, right: 80, fontSize: 38, lineHeight: 1.28, color: '#ded8cf', opacity: interpolate(frame, [25, 52], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)}), translate: `0 ${interpolate(frame, [25, 52], [22, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px`}}>{children}</div>;
};
