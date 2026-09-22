import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {PipelineDiagram} from './PipelineDiagram';
import {phases, type PhaseNumber} from './pipeline-data';

type PhaseSceneProps = {phase: PhaseNumber};

export const PhaseScene: React.FC<PhaseSceneProps> = ({phase}) => {
  const frame = useCurrentFrame();
  const current = phases[phase - 1];
  const note = phase === 1 ? 'Keep the article intact. Remove only non-article noise.' : phase === 2 ? 'One grounded issue, always retained when complete.' : 'Every complete issue continues — including NEEDS_REVIEW.';
  const noteOpacity = interpolate(frame, [8, 22], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

  return (
    <AbsoluteFill style={{padding: '76px 92px 44px'}}>
      <div style={{display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 600px', gap: 56, alignItems: 'end'}}>
        <div>
          <div style={{fontSize: 16, letterSpacing: 3, color: '#f2a93b', fontWeight: 700}}>{current.eyebrow}</div>
          <div style={{fontSize: 42, color: '#f6f1e7', fontWeight: 700, marginTop: 8}}>{current.title}</div>
        </div>
        <div style={{opacity: noteOpacity, color: '#b5becb', fontSize: 20, textAlign: 'right', lineHeight: 1.35, paddingBottom: 4}}>{note}</div>
      </div>
      <div style={{position: 'relative', height: 550, marginTop: 48}}>
        <PipelineDiagram activePhase={phase} showCounts={false} />
      </div>
    </AbsoluteFill>
  );
};
