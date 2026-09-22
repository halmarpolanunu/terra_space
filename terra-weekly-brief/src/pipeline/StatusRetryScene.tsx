import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const states = [
  {label: 'VALID', detail: 'verified + accepted', color: '#7ed7a1'},
  {label: 'NEEDS_REVIEW', detail: 'complete output retained', color: '#f2a93b'},
  {label: 'FAILED', detail: 'technical issue only', color: '#f08080'},
];

export const StatusRetryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const retryOpacity = interpolate(frame, [fps, fps * 1.55], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

  return (
    <AbsoluteFill style={{padding: '110px 126px', justifyContent: 'center'}}>
      <div style={{color: '#f6f1e7', fontSize: 48, fontWeight: 700}}>Store the output. Flag the doubt.</div>
      <div style={{display: 'flex', gap: 22, marginTop: 52}}>
        {states.map((state, index) => {
          const scale = spring({frame: Math.max(0, frame - index * 5), fps, config: {damping: 200, stiffness: 180}});
          return (
            <div key={state.label} style={{flex: 1, minHeight: 184, borderTop: `3px solid ${state.color}`, background: 'rgba(246, 241, 231, 0.055)', padding: '28px 28px', scale, opacity: scale}}>
              <div style={{color: state.color, fontSize: 20, letterSpacing: 2, fontWeight: 700}}>{state.label}</div>
              <div style={{color: '#f6f1e7', fontSize: 27, marginTop: 22, lineHeight: 1.2}}>{state.detail}</div>
            </div>
          );
        })}
      </div>
      <div style={{opacity: retryOpacity, color: '#b5becb', fontSize: 22, marginTop: 34, letterSpacing: 0.5}}>
        FAILED only → owner starts manual retry → output is updated, history remains.
      </div>
    </AbsoluteFill>
  );
};
