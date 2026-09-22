import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const amber = '#f2a93b';
const paper = '#f6f1e7';

export const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleOpacity = interpolate(frame, [0, fps * 0.7], [0.24, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

  return (
    <AbsoluteFill style={{justifyContent: 'center', padding: '0 150px'}}>
      <div style={{opacity: titleOpacity, borderLeft: `4px solid ${amber}`, paddingLeft: 28}}>
        <div style={{color: amber, letterSpacing: 8, fontWeight: 700, fontSize: 20}}>TERRA SPACE / PIPELINE</div>
        <div style={{color: paper, fontSize: 74, lineHeight: 0.98, fontWeight: 700, marginTop: 20, letterSpacing: -2}}>Article →<br />Event Candidates</div>
      </div>
    </AbsoluteFill>
  );
};
